variable "project_id" {
  type = string
}

variable "project_number" {
  type        = string
  description = "GCP project number (not ID). Used to grant the Cloud Run service agent networkUser on the subnet for Direct VPC egress."
}

variable "region" {
  type = string
}
