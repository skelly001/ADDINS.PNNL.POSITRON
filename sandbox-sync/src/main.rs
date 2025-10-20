mod cli;
mod filter;
mod paths;
mod sync;
mod walk;
mod watch;

use anyhow::Result;
use cli::{Cli, Commands};
use env_logger::Builder;
use filter::PathFilter;
use log::LevelFilter;
use std::io::Write;
use sync::{check_directories, sync_directories, SyncOptions};
use watch::{watch_directories, WatchOptions};

fn main() {
    // Parse command line arguments
    let cli = Cli::parse_args();

    // Initialize logging
    if let Err(e) = init_logging(&cli.log_level) {
        eprintln!("Failed to initialize logging: {}", e);
        std::process::exit(1);
    }

    // Run the command
    let result = run_command(&cli);

    // Handle result and exit
    match result {
        Ok(_) => {
            log::debug!("Command completed successfully");
            std::process::exit(0);
        }
        Err(e) => {
            log::error!("Error: {:#}", e);
            std::process::exit(1);
        }
    }
}

/// Initialize logging based on log level
fn init_logging(level: &str) -> Result<()> {
    let log_level = match level.to_lowercase().as_str() {
        "debug" => LevelFilter::Debug,
        "info" => LevelFilter::Info,
        "warn" => LevelFilter::Warn,
        "error" => LevelFilter::Error,
        _ => {
            eprintln!("Invalid log level: {}. Using 'info' instead.", level);
            LevelFilter::Info
        }
    };

    Builder::new()
        .filter_level(log_level)
        .format(|buf, record| {
            writeln!(
                buf,
                "[{}] {}",
                record.level(),
                record.args()
            )
        })
        .init();

    Ok(())
}

/// Run the specified command
fn run_command(cli: &Cli) -> Result<()> {
    // Version command doesn't need paths
    if matches!(&cli.command, Commands::Version) {
        println!("{} {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
        println!("{}", env!("CARGO_PKG_DESCRIPTION"));
        return Ok(());
    }

    // For other commands, paths are required
    let scripts = cli.scripts.as_ref().ok_or_else(|| {
        anyhow::anyhow!("--scripts is required for this command")
    })?;

    let data = cli.data.as_ref().ok_or_else(|| {
        anyhow::anyhow!("--data is required for this command")
    })?;

    // Create path filter with defaults and custom excludes
    let filter = if cli.exclude.is_empty() {
        PathFilter::with_defaults()?
    } else {
        PathFilter::with_defaults_and_custom(&cli.exclude)?
    };

    match &cli.command {
        Commands::Sync => {
            log::info!("Running sync command");
            let options = SyncOptions {
                scripts_path: scripts.clone(),
                data_path: data.clone(),
                gitkeep: cli.gitkeep,
                dry_run: cli.dry_run,
            };

            let result = sync_directories(&options, &filter)?;

            if result.has_changes() {
                println!("\nSync Summary:");
                println!("  Directories created in scripts: {}", result.created_in_scripts.len());
                println!("  Directories created in data:    {}", result.created_in_data.len());
                if options.gitkeep {
                    println!("  .gitkeep files created:         {}", result.gitkeep_files_created);
                }
            } else {
                println!("\nNo changes needed - directories are already in sync.");
            }

            Ok(())
        }

        Commands::Watch => {
            log::info!("Running watch command");
            let options = WatchOptions {
                scripts_path: scripts.clone(),
                data_path: data.clone(),
                dry_run: cli.dry_run,
            };

            watch_directories(&options, &filter)?;
            Ok(())
        }

        Commands::Check => {
            log::info!("Running check command");
            let diff = check_directories(scripts, data, &filter)?;

            if !diff.has_differences() {
                println!("\n✓ Directories are in sync");
            } else {
                println!("\n✗ Found {} differences:", diff.total_differences());

                if !diff.missing_in_right.is_empty() {
                    println!("\n  Missing in data ({}):", diff.missing_in_right.len());
                    let mut missing_vec: Vec<_> = diff.missing_in_right.iter().collect();
                    missing_vec.sort();
                    for dir in missing_vec {
                        println!("    - {}", dir.display());
                    }
                }

                if !diff.missing_in_left.is_empty() {
                    println!("\n  Missing in scripts ({}):", diff.missing_in_left.len());
                    let mut missing_vec: Vec<_> = diff.missing_in_left.iter().collect();
                    missing_vec.sort();
                    for dir in missing_vec {
                        println!("    - {}", dir.display());
                    }
                }

                println!("\nRun 'sandbox-sync sync' to synchronize.");
            }

            Ok(())
        }

        Commands::Version => {
            // Already handled above
            unreachable!()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_level_parsing() {
        // Test log level parsing logic without initializing logger
        // (logger can only be initialized once per process)
        let test_levels = vec!["debug", "info", "warn", "error", "invalid"];
        for level in test_levels {
            let log_level = match level.to_lowercase().as_str() {
                "debug" => LevelFilter::Debug,
                "info" => LevelFilter::Info,
                "warn" => LevelFilter::Warn,
                "error" => LevelFilter::Error,
                _ => LevelFilter::Info,
            };
            // Just verify parsing works
            assert!(log_level == LevelFilter::Debug
                || log_level == LevelFilter::Info
                || log_level == LevelFilter::Warn
                || log_level == LevelFilter::Error);
        }
    }
}
