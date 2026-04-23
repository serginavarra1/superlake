output "connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
}

output "database" {
  value = google_sql_database.superlake.name
}

output "user" {
  value = google_sql_user.app.name
}

output "password" {
  value     = random_password.db_password.result
  sensitive = true
}
