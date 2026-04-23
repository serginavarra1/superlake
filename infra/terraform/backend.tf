terraform {
  backend "gcs" {
    # Pass bucket at init time:
    # terraform init -backend-config="bucket=superlake-tfstate"
    prefix = "terraform/state"
  }
}
