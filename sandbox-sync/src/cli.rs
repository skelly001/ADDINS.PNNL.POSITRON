use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "sandbox-sync")]
#[command(about = "Fast directory structure synchronization for Git and OneDrive sandboxes", long_about = None)]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,

    /// Scripts sandbox path (Git-tracked)
    #[arg(long, global = true, required = false)]
    pub scripts: Option<PathBuf>,

    /// Data sandbox path (OneDrive, no Git)
    #[arg(long, global = true, required = false)]
    pub data: Option<PathBuf>,

    /// Create .gitkeep files in empty directories (scripts side only)
    #[arg(long, global = true, default_value = "false")]
    pub gitkeep: bool,

    /// Exclude patterns (glob syntax, repeatable)
    #[arg(long, global = true)]
    pub exclude: Vec<String>,

    /// Dry run - show what would be done without making changes
    #[arg(long, global = true, default_value = "false")]
    pub dry_run: bool,

    /// Log level (debug, info, warn, error)
    #[arg(long, global = true, default_value = "info")]
    pub log_level: String,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// One-shot sync: create missing directories on both sides
    Sync,

    /// Watch mode: mirror new directory creations in real-time
    Watch,

    /// Check: report missing directories on each side
    Check,

    /// Show version information
    Version,
}

impl Cli {
    /// Parse command line arguments
    pub fn parse_args() -> Self {
        Cli::parse()
    }

    /// Get all exclude patterns (defaults + custom)
    pub fn get_all_excludes(&self) -> Vec<String> {
        // Default excludes are handled in filter.rs PathFilter::default_excludes()
        // Here we just return the custom excludes provided by the user
        self.exclude.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_parsing() {
        // This test verifies the CLI structure compiles correctly
        // Actual CLI parsing is tested through integration tests
        let _ = Cli::parse_args;
    }

    #[test]
    fn test_custom_excludes() {
        let cli = Cli {
            command: Commands::Sync,
            scripts: Some(PathBuf::from("/scripts")),
            data: Some(PathBuf::from("/data")),
            gitkeep: false,
            exclude: vec!["*.tmp".to_string(), "cache".to_string()],
            dry_run: false,
            log_level: "info".to_string(),
        };

        let excludes = cli.get_all_excludes();
        assert_eq!(excludes.len(), 2);
        assert!(excludes.contains(&"*.tmp".to_string()));
        assert!(excludes.contains(&"cache".to_string()));
    }

    #[test]
    fn test_empty_excludes() {
        let cli = Cli {
            command: Commands::Sync,
            scripts: Some(PathBuf::from("/scripts")),
            data: Some(PathBuf::from("/data")),
            gitkeep: false,
            exclude: vec![],
            dry_run: false,
            log_level: "info".to_string(),
        };

        let excludes = cli.get_all_excludes();
        assert_eq!(excludes.len(), 0);
    }
}
