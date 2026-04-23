variable "org_id" {
  type = string
}

variable "billing_account_id" {
  type = string
}

variable "tenants_folder_id" {
  type        = string
  description = "Numeric folder ID (without 'folders/' prefix)"
}

variable "api_runtime_email" {
  type = string
}
