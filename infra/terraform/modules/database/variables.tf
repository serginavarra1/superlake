variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "network_id" {
  type = string
}

variable "db_tier" {
  type    = string
  default = "db-f1-micro"
}

# Pass the PSA connection resource ID so Terraform waits for peering before creating the instance
variable "psa_connection_id" {
  type    = string
  default = null
}
