use crate::filter::PathFilter;
use crate::output::{EnsurePathOutput, ExitCode, SyncFullOutput};
use crate::paths;
use crate::sync;
use crate::walk;
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Parser)]
#[command(name = "sandbox-sync")]
#[command(about = "Fast directory structure synchronization tool for R sandbox workflows", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Bidirectional directory mirroring between scripts and data paths
    SyncFull {
        /// Path to the scripts sandbox (SCRIPT_PATH)
        #[arg(long, value_name = "PATH")]
        scripts: PathBuf,

        /// Path to the data sandbox (DATA_PATH)
        #[arg(long, value_name = "PATH")]
        data: PathBuf,

        /// Output JSON instead of human-readable text
        #[arg(long)]
        json: bool,
    },

    /// Ensure a single relative path exists in both sandboxes
    EnsurePath {
        /// Path to the scripts sandbox (SCRIPT_PATH)
        #[arg(long, value_name = "PATH")]
        scripts: PathBuf,

        /// Path to the data sandbox (DATA_PATH)
        #[arg(long, value_name = "PATH")]
        data: PathBuf,

        /// Relative path to ensure (e.g., "dir1/dir2")
        #[arg(long, value_name = "PATH")]
        relative: PathBuf,

        /// Output JSON instead of human-readable text
        #[arg(long)]
        json: bool,
    },
}

pub fn run() -> Result<ExitCode> {
    let cli = Cli::parse();

    match cli.command {
        Commands::SyncFull {
            scripts,
            data,
            json,
        } => run_sync_full(scripts, data, json),
        Commands::EnsurePath {
            scripts,
            data,
            relative,
            json,
        } => run_ensure_path(scripts, data, relative, json),
    }
}

fn run_sync_full(scripts_path: PathBuf, data_path: PathBuf, json_output: bool) -> Result<ExitCode> {
    let start = Instant::now();

    // Validate and normalize paths
    let scripts_normalized = match paths::normalize_path(&scripts_path) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Error: Invalid scripts path: {}", e);
            return Ok(ExitCode::InvalidArguments);
        }
    };

    let data_normalized = match paths::normalize_path(&data_path) {
        Ok(p) => p,
        Err(e) => {
            if json_output {
                let output = SyncFullOutput::new(
                    scripts_path.clone(),
                    data_path.clone(),
                    0,
                    0,
                    0,
                    start.elapsed().as_millis() as u64,
                    vec![],
                    vec![format!("DATA_PATH is unavailable or inaccessible: {}", e)],
                );
                println!("{}", output.to_json()?);
            } else {
                eprintln!("Error: DATA_PATH is unavailable or inaccessible: {}", e);
            }
            return Ok(ExitCode::DataPathUnavailable);
        }
    };

    // Create filter
    let filter = PathFilter::new().context("Failed to create path filter")?;

    // Walk both directories and compute union
    let (scripts_dirs, data_dirs, union) =
        match walk::collect_union(&scripts_normalized, &data_normalized, &filter) {
            Ok(result) => result,
            Err(e) => {
                if json_output {
                    let output = SyncFullOutput::new(
                        scripts_normalized,
                        data_normalized,
                        0,
                        0,
                        0,
                        start.elapsed().as_millis() as u64,
                        vec![],
                        vec![format!("Failed to walk directories: {}", e)],
                    );
                    println!("{}", output.to_json()?);
                } else {
                    eprintln!("Error: Failed to walk directories: {}", e);
                }
                return Ok(ExitCode::FilesystemError);
            }
        };

    // Sync directories
    let sync_result = match sync::sync_directories(&scripts_normalized, &data_normalized, &union) {
        Ok(result) => result,
        Err(e) => {
            if json_output {
                let output = SyncFullOutput::new(
                    scripts_normalized,
                    data_normalized,
                    0,
                    0,
                    0,
                    start.elapsed().as_millis() as u64,
                    vec![],
                    vec![format!("Failed to sync directories: {}", e)],
                );
                println!("{}", output.to_json()?);
            } else {
                eprintln!("Error: Failed to sync directories: {}", e);
            }
            return Ok(ExitCode::FilesystemError);
        }
    };

    let duration_ms = start.elapsed().as_millis() as u64;

    // Prepare output
    let output = SyncFullOutput::new(
        scripts_normalized,
        data_normalized,
        sync_result.created_in_scripts,
        sync_result.created_in_data,
        sync_result.existing_total(),
        duration_ms,
        sync_result.warnings,
        sync_result.errors,
    );

    // Print output
    if json_output {
        println!("{}", output.to_json()?);
    } else {
        println!("{}", output.to_human_string());
    }

    if output.ok {
        Ok(ExitCode::Success)
    } else {
        Ok(ExitCode::FilesystemError)
    }
}

fn run_ensure_path(
    scripts_path: PathBuf,
    data_path: PathBuf,
    relative_path: PathBuf,
    json_output: bool,
) -> Result<ExitCode> {
    let start = Instant::now();

    // Validate relative path
    if let Err(e) = paths::validate_relative_path(&relative_path) {
        if json_output {
            let output = EnsurePathOutput::new(
                scripts_path.clone(),
                data_path.clone(),
                relative_path.clone(),
                0,
                0,
                start.elapsed().as_millis() as u64,
                vec![],
                vec![format!("Invalid relative path: {}", e)],
            );
            println!("{}", output.to_json()?);
        } else {
            eprintln!("Error: Invalid relative path: {}", e);
        }
        return Ok(ExitCode::InvalidArguments);
    }

    // Validate and normalize paths
    let scripts_normalized = match paths::normalize_path(&scripts_path) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Error: Invalid scripts path: {}", e);
            return Ok(ExitCode::InvalidArguments);
        }
    };

    let data_normalized = match paths::normalize_path(&data_path) {
        Ok(p) => p,
        Err(e) => {
            if json_output {
                let output = EnsurePathOutput::new(
                    scripts_path.clone(),
                    data_path.clone(),
                    relative_path.clone(),
                    0,
                    0,
                    start.elapsed().as_millis() as u64,
                    vec![],
                    vec![format!("DATA_PATH is unavailable or inaccessible: {}", e)],
                );
                println!("{}", output.to_json()?);
            } else {
                eprintln!("Error: DATA_PATH is unavailable or inaccessible: {}", e);
            }
            return Ok(ExitCode::DataPathUnavailable);
        }
    };

    // Ensure the path
    let (scripts_count, data_count) =
        match sync::ensure_single_path(&scripts_normalized, &data_normalized, &relative_path) {
            Ok(result) => result,
            Err(e) => {
                if json_output {
                    let output = EnsurePathOutput::new(
                        scripts_normalized,
                        data_normalized,
                        relative_path,
                        0,
                        0,
                        start.elapsed().as_millis() as u64,
                        vec![],
                        vec![format!("Failed to ensure path: {}", e)],
                    );
                    println!("{}", output.to_json()?);
                } else {
                    eprintln!("Error: Failed to ensure path: {}", e);
                }
                return Ok(ExitCode::FilesystemError);
            }
        };

    let duration_ms = start.elapsed().as_millis() as u64;

    // Prepare output
    let output = EnsurePathOutput::new(
        scripts_normalized,
        data_normalized,
        relative_path,
        scripts_count,
        data_count,
        duration_ms,
        vec![],
        vec![],
    );

    // Print output
    if json_output {
        println!("{}", output.to_json()?);
    } else {
        println!("{}", output.to_human_string());
    }

    Ok(ExitCode::Success)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_sync_full_with_real_paths() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        // Create some test structure
        fs::create_dir_all(scripts.join("dir1/subdir")).unwrap();
        fs::create_dir_all(data.join("dir2")).unwrap();

        // Run sync-full
        let exit_code = run_sync_full(scripts.clone(), data.clone(), false).unwrap();
        assert_eq!(exit_code as i32, ExitCode::Success as i32);

        // Verify directories were synced
        assert!(scripts.join("dir2").exists());
        assert!(data.join("dir1").exists());
        assert!(data.join("dir1/subdir").exists());
    }

    #[test]
    fn test_ensure_path_with_real_paths() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let rel_path = PathBuf::from("new/nested/path");

        // Run ensure-path
        let exit_code = run_ensure_path(scripts.clone(), data.clone(), rel_path.clone(), false).unwrap();
        assert_eq!(exit_code as i32, ExitCode::Success as i32);

        // Verify paths were created
        assert!(scripts.join(&rel_path).exists());
        assert!(data.join(&rel_path).exists());
    }

    #[test]
    fn test_ensure_path_rejects_traversal() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let bad_path = PathBuf::from("../escape");

        // Run ensure-path - should fail
        let exit_code = run_ensure_path(scripts, data, bad_path, false).unwrap();
        assert_eq!(exit_code as i32, ExitCode::InvalidArguments as i32);
    }

    #[test]
    fn test_data_path_unavailable() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("nonexistent");

        fs::create_dir(&scripts).unwrap();

        // Run sync-full with nonexistent data path
        let exit_code = run_sync_full(scripts, data, false).unwrap();
        assert_eq!(exit_code as i32, ExitCode::DataPathUnavailable as i32);
    }
}
