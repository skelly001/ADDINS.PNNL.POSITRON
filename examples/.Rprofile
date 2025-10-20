# Sandbox-Sync R Integration
# Auto-sync script and data directories on R startup

.sandbox_sync <- function() {
  # Configuration
  config_file <- "sandbox.config.json"
  binary_name <- "sandbox-sync"

  # Try to find binary in PATH
  binary_path <- Sys.which(binary_name)

  # If not in PATH, try environment variable
  if (binary_path == "") {
    env_binary <- Sys.getenv("SANDBOX_SYNC_PATH", "")
    if (env_binary != "" && file.exists(env_binary)) {
      binary_path <- env_binary
    }
  }

  # If still not found, try config file
  if (binary_path == "" && file.exists(config_file)) {
    tryCatch({
      # Try to load config - handle case where jsonlite not installed
      if (requireNamespace("jsonlite", quietly = TRUE)) {
        config <- jsonlite::fromJSON(config_file)
        if (!is.null(config$binaryPath) && file.exists(config$binaryPath)) {
          binary_path <- config$binaryPath
        }
      }
    }, error = function(e) {
      # Ignore errors reading config
    })
  }

  if (binary_path == "" || !file.exists(as.character(binary_path))) {
    message("Note: sandbox-sync binary not found. Install it and ensure it's in PATH.")
    return(invisible(NULL))
  }

  # Get paths from environment variables (set by Docker or user)
  scripts_path <- Sys.getenv("SCRIPT_PATH", "")
  data_path <- Sys.getenv("DATA_PATH", "")

  # If not in environment, try config file
  if ((scripts_path == "" || data_path == "") && file.exists(config_file)) {
    tryCatch({
      if (requireNamespace("jsonlite", quietly = TRUE)) {
        config <- jsonlite::fromJSON(config_file)
        if (scripts_path == "" && !is.null(config$scriptsPath)) {
          scripts_path <- config$scriptsPath
        }
        if (data_path == "" && !is.null(config$dataPath)) {
          data_path <- config$dataPath
        }
      }
    }, error = function(e) {
      # Ignore errors
    })
  }

  # If paths still not found, try to use current directory as scripts path
  if (scripts_path == "") {
    scripts_path <- getwd()
  }

  if (data_path == "") {
    message("Note: DATA_PATH not configured. Skipping sandbox sync.")
    message("Set DATA_PATH environment variable or create sandbox.config.json")
    return(invisible(NULL))
  }

  # Build sync command arguments
  # On Windows, paths with spaces need to be quoted
  quote_if_needed <- function(path) {
    if (grepl(" ", path) && .Platform$OS.type == "windows") {
      return(shQuote(path, type = "cmd"))
    }
    return(path)
  }

  args <- c(
    "sync",
    "--scripts", quote_if_needed(scripts_path),
    "--data", quote_if_needed(data_path),
    "--log-level", "info"
  )

  # Add optional arguments from config
  if (file.exists(config_file)) {
    tryCatch({
      if (requireNamespace("jsonlite", quietly = TRUE)) {
        config <- jsonlite::fromJSON(config_file)

        # Add gitkeep flag
        if (!is.null(config$gitkeep) && config$gitkeep) {
          args <- c(args, "--gitkeep")
        }

        # Add excludes - skip on Windows if they contain wildcards to avoid shell expansion issues
        if (!is.null(config$excludes) && length(config$excludes) > 0) {
          # Only add excludes if they don't contain wildcards (Windows issue)
          for (exclude in config$excludes) {
            if (!grepl("[*?]", exclude)) {
              args <- c(args, "--exclude", exclude)
            }
          }
        }
      }
    }, error = function(e) {
      # Ignore errors
    })
  }

  # Run sync
  tryCatch({
    message("Syncing sandbox directories...")
    message("  Scripts: ", scripts_path)
    message("  Data:    ", data_path)

    result <- system2(
      as.character(binary_path),
      args,
      stdout = TRUE,
      stderr = TRUE
    )

    # Check exit status
    status <- attr(result, "status")
    if (!is.null(status) && status != 0) {
      warning("Sandbox sync failed with exit code ", status)
      if (length(result) > 0) {
        message("Output: ", paste(result, collapse = "\n"))
      }
    } else {
      message("Sandbox sync completed successfully")
    }
  }, error = function(e) {
    warning("Error running sandbox-sync: ", conditionMessage(e))
  })

  invisible(NULL)
}

# Run sync on startup (only in interactive sessions)
if (interactive()) {
  .sandbox_sync()
}

# Clean up helper function from global environment
rm(.sandbox_sync)
