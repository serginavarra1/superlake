output "wif_provider" {
  description = "Full resource name of the WIF provider, used as workload_identity_provider in google-github-actions/auth"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "ci_sa_email" {
  description = "Email of the ci-deploy service account that GitHub Actions impersonates"
  value       = google_service_account.ci_deploy.email
}
