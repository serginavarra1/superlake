# Superlake Terraform — Bootstrap Guide

## Prerequisites

- `terraform` ≥ 1.6
- `gcloud` CLI authenticated with an account that has **Organization Admin** and **Billing Account Admin** roles
- A GCS bucket to store Terraform state (**created manually once**)

---

## 1. Authenticate

```bash
gcloud auth application-default login
```

---

## 2. Create the state bucket (one-time)

Pick any existing project you already have access to as `<bootstrap-project>`.

```bash
gsutil mb -p <bootstrap-project> -l europe-southwest1 gs://superlake-tfstate
gsutil versioning set on gs://superlake-tfstate
```

---

## 3. Configure variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your org_id, billing_account_id, etc.
```

For the first apply, `cors_origin` and `api_base_url_for_agent` are circular (you won't know Cloud Run URLs yet). Use placeholder values — update them after the first deploy.

---

## 4. Init and plan

```bash
terraform init -backend-config="bucket=superlake-tfstate"
terraform plan
```

Expected: ~55–65 resources to create, 0 to modify.

---

## 5. Apply

```bash
terraform apply
```

Cloud SQL creation is the bottleneck — expect ~10–15 min total.

---

## 6. Capture outputs

```bash
terraform output
```

Save these values — you'll need them in the next steps:

| Output | Used for |
|---|---|
| `base_project_id` | Docker image paths, gcloud commands |
| `db_connection_name` | Cloud Run `--add-cloudsql-instances` |
| `db_private_ip` | DATABASE_URL in secrets |
| `db_password` | DATABASE_URL in secrets (`terraform output -raw db_password`) |
| `artifact_registry_url` | Docker push/pull |
| `bigquery_read_sa_email` | GCP_BQ_READ_SA env var |
| `bigquery_write_sa_email` | GCP_BQ_WRITE_SA env var |
| `api_cloud_run_url` | CORS_ORIGIN, agent API_BASE_URL |
| `web_cloud_run_url` | Fivetran redirect URL |

---

## 7. Add secret versions

Terraform creates the Secret Manager secrets themselves (see `secrets.tf`) and grants the runtime SAs access. You only need to **add a version** (the actual value) to each.

The DATABASE_URL must end with `?schema=public` — required by Prisma to point at the correct schema.

```bash
PROJECT=$(terraform output -raw base_project_id)
DB_PASSWORD=$(terraform output -raw db_password)
DB_IP=$(terraform output -raw db_private_ip)

# API secrets
echo -n "postgresql://app:${DB_PASSWORD}@${DB_IP}:5432/superlake?sslmode=require&schema=public" | \
  gcloud secrets versions add superlake-api-database-url --data-file=- --project=$PROJECT

echo -n "postgresql://app:${DB_PASSWORD}@${DB_IP}:5432/superlake?sslmode=require&schema=public" | \
  gcloud secrets versions add superlake-agent-database-url --data-file=- --project=$PROJECT

# Clerk
echo -n "pk_live_xxx" | gcloud secrets versions add superlake-clerk-publishable-key --data-file=- --project=$PROJECT
echo -n "sk_live_xxx" | gcloud secrets versions add superlake-clerk-secret-key       --data-file=- --project=$PROJECT
echo -n "whsec_xxx"   | gcloud secrets versions add superlake-clerk-webhook-secret   --data-file=- --project=$PROJECT

# Fivetran
echo -n "your-key"    | gcloud secrets versions add superlake-fivetran-api-key    --data-file=- --project=$PROJECT
echo -n "your-secret" | gcloud secrets versions add superlake-fivetran-api-secret --data-file=- --project=$PROJECT

# Google AI (for agent)
echo -n "AIza..." | gcloud secrets versions add superlake-google-ai-api-key --data-file=- --project=$PROJECT
```

> Note: Cloud Run services won't start until each secret has at least one version. The first `terraform apply` will create the secrets but fail on the Cloud Run services — add the versions, then re-apply.

**Secret names referenced by Cloud Run (do not rename):**

| Secret name | Used by |
|---|---|
| `superlake-api-database-url` | api (`DATABASE_URL` with `?schema=public`) |
| `superlake-agent-database-url` | agent (`DATABASE_URL`, no schema suffix) |
| `superlake-clerk-publishable-key` | api + agent |
| `superlake-clerk-secret-key` | api + agent |
| `superlake-clerk-webhook-secret` | api |
| `superlake-fivetran-api-key` | api |
| `superlake-fivetran-api-secret` | api |
| `superlake-google-ai-api-key` | agent |

---

## 8. Build and push Docker images

All three Dockerfiles use the **repo root** as the build context (they need the pnpm workspace files).

```powershell
$PROJECT = terraform output -raw base_project_id
$REGISTRY = "europe-southwest1-docker.pkg.dev/$PROJECT/superlake-containers"

gcloud auth configure-docker europe-southwest1-docker.pkg.dev

# API
docker build -f apps/api/Dockerfile -t "$REGISTRY/superlake-api:latest" .
docker push "$REGISTRY/superlake-api:latest"

# Agent
docker build -f apps/agent/Dockerfile -t "$REGISTRY/superlake-agent:latest" .
docker push "$REGISTRY/superlake-agent:latest"

# Web — VITE_* vars are inlined at build time, pass them via --build-arg.
# VITE_API_URL points to the NestJS API; VITE_MASTRA_API_URL points to the
# Mastra agent (different Cloud Run service, different routes).
$API_URL   = terraform output -raw api_cloud_run_url
$AGENT_URL = terraform output -raw agent_cloud_run_url
docker build -f apps/web/Dockerfile `
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="pk_live_xxx" `
  --build-arg VITE_API_URL="$API_URL" `
  --build-arg VITE_MASTRA_API_URL="$AGENT_URL" `
  -t "$REGISTRY/superlake-web:latest" .
docker push "$REGISTRY/superlake-web:latest"
```

---

## 9. Deploy images to Cloud Run

Terraform manages the service configuration; CI/CD (or this one-shot command) updates the image.

```powershell
$PROJECT = terraform output -raw base_project_id
$REGISTRY = "europe-southwest1-docker.pkg.dev/$PROJECT/superlake-containers"
$REGION = "europe-southwest1"

gcloud run services update superlake-api   --image="$REGISTRY/superlake-api:latest"   --region=$REGION --project=$PROJECT
gcloud run services update superlake-agent --image="$REGISTRY/superlake-agent:latest" --region=$REGION --project=$PROJECT
gcloud run services update superlake-web   --image="$REGISTRY/superlake-web:latest"   --region=$REGION --project=$PROJECT
```

---

## 9.5. Run database migrations

Cloud SQL has private IP only — you can't reach it from your laptop. Terraform declares a Cloud Run **job** (`superlake-api-migrate`) that uses the API image to run `npx prisma migrate deploy` against the database from inside the VPC.

First update the job to the freshly-pushed image (on the first apply it still points at `gcr.io/cloudrun/hello`), then execute it:

```powershell
$PROJECT = terraform output -raw base_project_id
$REGISTRY = "europe-southwest1-docker.pkg.dev/$PROJECT/superlake-containers"
$REGION = "europe-southwest1"

gcloud run jobs update superlake-api-migrate --image="$REGISTRY/superlake-api:latest" --region=$REGION --project=$PROJECT
gcloud run jobs execute superlake-api-migrate --region=$REGION --project=$PROJECT --wait
```

Re-run the same two commands any time you ship new migrations (after rebuilding and pushing the API image in step 8).

---

## 10. Fix the circular URLs and re-apply

After the first deploy, update `terraform.tfvars` with the real Cloud Run URLs:

```powershell
terraform output api_cloud_run_url
terraform output web_cloud_run_url
```

Set `cors_origin`, `api_base_url_for_agent`, and `fivetran_connect_card_redirect_url` in `terraform.tfvars`, then:

```powershell
terraform apply
```

---

## 11. Bootstrap CI/CD (GitHub Actions)

The `ci_cd` module creates a Workload Identity Federation pool + a `ci-deploy` service account that GitHub Actions impersonates without storing any long-lived key.

### 11.1 Set the repo and apply

In `terraform.tfvars`:

```hcl
github_repo = "owner/repo"
```

Then `terraform apply`. After it completes, capture the outputs:

```bash
terraform output wif_provider
terraform output -raw ci_sa_email
terraform output -raw artifact_registry_url
terraform output -raw base_project_id
```

### 11.2 Configure the GitHub repo

In **Repository settings → Secrets and variables → Actions**:

**Variables** (not secret):

| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | `terraform output -raw base_project_id` |
| `GCP_REGION` | `europe-southwest1` |
| `ARTIFACT_REGISTRY` | `terraform output -raw artifact_registry_url` |
| `WIF_PROVIDER` | `terraform output wif_provider` (the full `projects/.../providers/github-provider` string) |
| `CI_SA_EMAIL` | `terraform output -raw ci_sa_email` |
| `VITE_API_URL` | `terraform output -raw api_cloud_run_url` |
| `VITE_MASTRA_API_URL` | `terraform output -raw agent_cloud_run_url` |

**Secrets**:

| Name | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Same `pk_live_...` you used for the runtime Clerk secret |

### 11.3 First deploy

Push to `main` (or hit "Run workflow" on `deploy.yml` from the Actions tab). The pipeline will:

1. Build & push images to Artifact Registry as `:latest`.
2. Run `superlake-api-migrate` Cloud Run job (Prisma migrations) inside the VPC.
3. Update the Cloud Run services to roll the new image's digest.

If a migration fails, `deploy-api` is skipped — the old API keeps serving and the DB stays on the previous schema.

---

## Known issues

### PSA peering orphan on destroy

`google_service_networking_connection` leaves a VPC peering (`servicenetworking-googleapis-com`) that Terraform cannot clean up. To destroy cleanly:

```powershell
# Remove Cloud SQL deletion_protection first
terraform apply -var 'db_deletion_protection=false'  # (not yet a variable — edit database/main.tf)
gcloud services vpc-peerings delete --network=superlake-vpc --project=<PROJECT> servicenetworking-googleapis-com
terraform destroy
```

### Cloud SQL deletion protection

`deletion_protection = true` is set by default. `terraform destroy` will fail until you set it to `false` and apply first.

### Placeholder images

On the first `terraform apply`, Cloud Run services run `gcr.io/cloudrun/hello`. This is expected — the `lifecycle.ignore_changes` block ensures subsequent image updates via `gcloud run services update` don't conflict with Terraform.
