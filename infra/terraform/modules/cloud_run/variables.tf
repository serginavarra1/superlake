variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type        = string
  description = "Cloud Run service name"
}

variable "image" {
  type        = string
  description = "Container image. Ignored after first deploy (lifecycle.ignore_changes)."
  default     = "gcr.io/cloudrun/hello"
}

variable "service_account_email" {
  type = string
}

variable "vpc_network" {
  type        = string
  description = "VPC network name for Direct VPC egress. null = no VPC attachment."
  default     = null
}

variable "vpc_subnetwork" {
  type        = string
  description = "VPC subnetwork name for Direct VPC egress. Required when vpc_network is set."
  default     = null
}

variable "vpc_egress" {
  type        = string
  description = "'ALL_TRAFFIC' or 'PRIVATE_RANGES_ONLY'. Ignored when vpc_network is null."
  default     = "PRIVATE_RANGES_ONLY"
}

variable "allow_unauthenticated" {
  type    = bool
  default = true
}

variable "port" {
  type    = number
  default = 8080
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 10
}

variable "cpu" {
  type    = string
  default = "1000m"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "env_vars" {
  type        = map(string)
  description = "Plain environment variables"
  default     = {}
}

variable "secret_env_vars" {
  type = map(object({
    secret  = string
    version = string
  }))
  description = "Environment variables sourced from Secret Manager. Keys are env var names, values are {secret, version}."
  default = {}
}
