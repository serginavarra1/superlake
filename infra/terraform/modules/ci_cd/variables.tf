variable "project_id" {
  type = string
}

variable "project_number" {
  type        = string
  description = "Numeric GCP project number (used to build the WIF principalSet)"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository allowed to impersonate the CI service account, in 'owner/repo' format"
}

variable "api_runtime_email" {
  type        = string
  description = "Email of the api runtime SA — CI needs serviceAccountUser on it to deploy Cloud Run"
}

variable "agent_runtime_email" {
  type        = string
  description = "Email of the agent runtime SA"
}

variable "web_runtime_email" {
  type        = string
  description = "Email of the web runtime SA"
}
