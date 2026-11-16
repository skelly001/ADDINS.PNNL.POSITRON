use crate::output::{EnsurePathOutput, ExitCode, SyncFullOutput};
use crate::paths;
use crate::sync;
use crate::walk;
use anyhow::Result;
use clap::{Args, Parser, Subcommand};
use std::path::{Path, PathBuf};
use std::time::Instant;

#[derive(Parser)]
#[command(name = "sandbox-sync")]
#[command(about = "Fast directory structure synchronization tool for R sandbox workflows", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

/// The two sandbox roots, shared by every command.
#[derive(Args)]
struct Bases {
    /// Path to the scripts sandbox (SCRIPT_PATH)
    #[arg(long, alias = "scripts-path", value_name = "PATH")]
    scripts: PathBuf,

    /// Path to the data sandbox (DATA_PATH)
    #[arg(long, alias = "data-path", value_name = "PATH")]
    data: PathBuf,

    /// Output JSON instead of human-readable text
    #[arg(long)]
    json: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Bidirectional directory mirroring between scripts and data paths
    SyncFull {
        #[command(flatten)]
        bases: Bases,
    },

    /// Ensure a single relative path exists in both sandboxes
    EnsurePath {
        #[command(flatten)]
        bases: Bases,

        /// Relative path to ensure (e.g., "dir1/dir2"); empty means the roots
        #[arg(long, value_name = "PATH", default_value = "")]
        relative: String,
    },
}

pub fn run() -> Result<ExitCode> {
    match Cli::parse().command {
        Commands::SyncFull { bases } => run_sync_full(&bases.scripts, &bases.data, bases.json),
        Commands::EnsurePath { bases, relative } => run_ensure_path(
            &bases.scripts,
            &bases.data,
            Path::new(&relative),
            bases.json,
        ),
    }
}

/// A failure that ends a command early: the exit code and the message to report.
type Failure = (ExitCode, String);

/// Validates and normalizes both base paths.
fn resolve_bases(scripts: &Path, data: &Path) -> Result<(PathBuf, PathBuf), Failure> {
    let scripts = paths::normalize_path(scripts).map_err(|e| {
        (
            ExitCode::InvalidArguments,
            format!("Invalid scripts path: {:#}", e),
        )
    })?;
    let data = paths::normalize_path(data).map_err(|e| {
        (
            ExitCode::DataPathUnavailable,
            format!("DATA_PATH is unavailable or inaccessible: {:#}", e),
        )
    })?;
    Ok((scripts, data))
}

fn elapsed_ms(start: Instant) -> u64 {
    start.elapsed().as_millis() as u64
}

fn run_sync_full(scripts_path: &Path, data_path: &Path, json: bool) -> Result<ExitCode> {
    let start = Instant::now();

    let attempt = || -> Result<SyncFullOutput, Failure> {
        let (scripts, data) = resolve_bases(scripts_path, data_path)?;

        let scripts_walk = walk::collect_directories(&scripts);
        let data_walk = walk::collect_directories(&data);

        let result =
            sync::sync_directories(&scripts, &data, &scripts_walk, &data_walk).map_err(|e| {
                (
                    ExitCode::FilesystemError,
                    format!("Failed to sync directories: {:#}", e),
                )
            })?;

        let mut warnings = scripts_walk.warnings;
        warnings.extend(data_walk.warnings);

        Ok(SyncFullOutput::new(
            scripts,
            data,
            result.created_in_scripts,
            result.created_in_data,
            result.existing_total(),
            elapsed_ms(start),
            warnings,
            result.errors,
        ))
    };

    let (exit_code, output) = match attempt() {
        Ok(output) if output.ok => (ExitCode::Success, output),
        Ok(output) => (ExitCode::FilesystemError, output),
        Err((exit_code, message)) => (
            exit_code,
            SyncFullOutput::new(
                scripts_path.to_path_buf(),
                data_path.to_path_buf(),
                0,
                0,
                0,
                elapsed_ms(start),
                vec![],
                vec![message],
            ),
        ),
    };

    output.print(json)?;
    Ok(exit_code)
}

fn run_ensure_path(
    scripts_path: &Path,
    data_path: &Path,
    relative_path: &Path,
    json: bool,
) -> Result<ExitCode> {
    let start = Instant::now();

    let attempt = || -> Result<EnsurePathOutput, Failure> {
        let relative = paths::validate_relative_path(relative_path).map_err(|e| {
            (
                ExitCode::InvalidArguments,
                format!("Invalid relative path: {:#}", e),
            )
        })?;
        let (scripts, data) = resolve_bases(scripts_path, data_path)?;

        let (scripts_count, data_count) = sync::ensure_single_path(&scripts, &data, &relative)
            .map_err(|e| {
                (
                    ExitCode::FilesystemError,
                    format!("Failed to ensure path: {:#}", e),
                )
            })?;

        Ok(EnsurePathOutput::new(
            scripts,
            data,
            relative,
            scripts_count,
            data_count,
            elapsed_ms(start),
            vec![],
            vec![],
        ))
    };

    let (exit_code, output) = match attempt() {
        Ok(output) => (ExitCode::Success, output),
        Err((exit_code, message)) => (
            exit_code,
            EnsurePathOutput::new(
                scripts_path.to_path_buf(),
                data_path.to_path_buf(),
                relative_path.to_path_buf(),
                0,
                0,
                elapsed_ms(start),
                vec![],
                vec![message],
            ),
        ),
    };

    output.print(json)?;
    Ok(exit_code)
}
