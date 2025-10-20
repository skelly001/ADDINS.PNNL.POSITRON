# Sandbox-Sync R Integration
# Auto-sync script and data directories on R startup

.sandbox_sync <- function() {
  # Configuration
  config_file <- ".sandbox.config.json"
  binary_name <- "sandbox-sync"

  # Try to find binary
  binary_path <- Sys.which(binary_name)

  if (binary_path == "") {
    # Try configured path
    if (file.exists(config_file)) {
      config <- jsonlite::fromJSON(config_file)
      if (!is.null(config$binaryPath) && file.exists(config$binaryPath)) {
        binary_path <- config$binaryPath
      }
    }
  }

  if (binary_path == "" || !file.exists(binary_path)) {
    message("sandbox-sync binary not found in PATH")
    return(invisible(NULL))
  }

  # Load configuration
  scripts_path <- Sys.getenv("SCRIPT_PATH", "")
  data_path <- Sys.getenv("DATA_PATH", "")

  if (file.exists(config_file)) {
    config <- jsonlite::fromJSON(config_file)
    if (is.null(scripts_path) || scripts_path == "") scripts_path <- config$scriptsPath
    if (is.null(data_path) || data_path == "") data_path <- config$dataPath
  }

  if (scripts_path == "" || data_path == "") {
    message("Sandbox paths not configured")
    return(invisible(NULL))
  }

  # Run sync
  tryCatch({
    message("Running sandbox-sync...")
    result <- system2(
      binary_path,
      c("sync", "--scripts", scripts_path, "--data", data_path),
      stdout = TRUE,
      stderr = TRUE
    )

    if (!is.null(attr(result, "status")) && attr(result, "status") != 0) {
      warning("sandbox-sync failed with status: ", attr(result, "status"))
    } else {
      message("Sandbox sync completed successfully")
    }
  }, error = function(e) {
    warning("Error running sandbox-sync: ", e$message)
  })

  invisible(NULL)
}

# Run sync on startup
if (interactive()) {
  .sandbox_sync()
}
