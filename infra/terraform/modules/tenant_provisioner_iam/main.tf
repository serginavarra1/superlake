locals {
  api_sa_member = "serviceAccount:${var.api_runtime_email}"

  folder_roles = [
    "roles/resourcemanager.projectCreator",
    "roles/resourcemanager.projectDeleter",
    "roles/resourcemanager.projectIamAdmin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/storage.admin",
  ]
}

# ── Folder-level bindings (tenant project lifecycle) ─────────────────────────

resource "google_folder_iam_member" "api_folder_roles" {
  for_each = toset(local.folder_roles)

  folder = "folders/${var.tenants_folder_id}"
  role   = each.value
  member = local.api_sa_member
}

# ── Billing account binding ──────────────────────────────────────────────────

resource "google_billing_account_iam_member" "api_billing_user" {
  billing_account_id = var.billing_account_id
  role               = "roles/billing.user"
  member             = local.api_sa_member
}
