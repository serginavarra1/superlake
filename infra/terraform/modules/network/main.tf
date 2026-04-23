resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = "superlake-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  project                  = var.project_id
  name                     = "superlake-subnet"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = "10.0.0.0/24"
  private_ip_google_access = true
}

# Private Service Access range — required for Cloud SQL private IP
resource "google_compute_global_address" "psa_range" {
  project       = var.project_id
  name          = "superlake-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa_range.name]

  # Workaround: destroy may leave a peering orphan — see README
  depends_on = [google_compute_global_address.psa_range]
}

# Grant the Cloud Run service agent networkUser on the subnet so services
# can use Direct VPC egress (network_interfaces in google_cloud_run_v2_service).
resource "google_compute_subnetwork_iam_member" "cloud_run_agent_network_user" {
  project    = var.project_id
  region     = var.region
  subnetwork = google_compute_subnetwork.subnet.name
  role       = "roles/compute.networkUser"
  member     = "serviceAccount:service-${var.project_number}@serverless-robot-prod.iam.gserviceaccount.com"
}

# Cloud Router + NAT so Cloud Run services with vpc_egress=ALL_TRAFFIC can
# reach the public internet (e.g. clerk.accounts.dev JWKS, Fivetran API).
resource "google_compute_router" "router" {
  project = var.project_id
  region  = var.region
  name    = "superlake-router"
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  project                            = var.project_id
  region                             = var.region
  name                               = "superlake-nat"
  router                             = google_compute_router.router.name
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

