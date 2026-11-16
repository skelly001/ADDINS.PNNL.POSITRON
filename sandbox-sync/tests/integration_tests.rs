//! End-to-end tests that run the `sandbox-sync` binary.

use assert_cmd::Command;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

struct Sandbox {
    _tmp: TempDir,
    scripts: PathBuf,
    data: PathBuf,
}

fn sandbox() -> Sandbox {
    let tmp = TempDir::new().unwrap();
    let scripts = tmp.path().join("r_script_sandbox");
    let data = tmp.path().join("data sandbox");
    fs::create_dir(&scripts).unwrap();
    fs::create_dir(&data).unwrap();
    Sandbox {
        _tmp: tmp,
        scripts,
        data,
    }
}

/// Runs the binary with `--json` and returns (exit code, parsed stdout).
fn run_json(args: &[&str], scripts: &Path, data: &Path) -> (i32, Value) {
    let output = Command::cargo_bin("sandbox-sync")
        .unwrap()
        .arg(args[0])
        .arg("--scripts")
        .arg(scripts)
        .arg("--data")
        .arg(data)
        .args(&args[1..])
        .arg("--json")
        .output()
        .unwrap();
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json = serde_json::from_str(&stdout)
        .unwrap_or_else(|e| panic!("stdout is not JSON ({e}): {stdout}"));
    (output.status.code().unwrap(), json)
}

#[test]
fn sync_full_mirrors_both_ways() {
    let sb = sandbox();
    fs::create_dir_all(sb.scripts.join("proj_a/analysis")).unwrap();
    fs::create_dir_all(sb.scripts.join("shared")).unwrap();
    fs::create_dir_all(sb.data.join("shared")).unwrap();
    fs::create_dir_all(sb.data.join("proj_b/raw data")).unwrap();
    fs::create_dir_all(sb.scripts.join(".git/objects")).unwrap();
    fs::write(sb.scripts.join("proj_a/script.R"), "x <- 1").unwrap();

    let (code, json) = run_json(&["sync-full"], &sb.scripts, &sb.data);

    assert_eq!(code, 0);
    assert_eq!(json["ok"], true);
    assert_eq!(json["created_in_scripts"], 2);
    assert_eq!(json["created_in_data"], 2);
    assert_eq!(json["created_total"], 4);
    assert_eq!(json["existing_total"], 6);
    assert!(sb.data.join("proj_a/analysis").is_dir());
    assert!(sb.scripts.join("proj_b/raw data").is_dir());
    // Hidden directories and files are never mirrored.
    assert!(!sb.data.join(".git").exists());
    assert!(!sb.data.join("proj_a/script.R").exists());
}

#[test]
fn sync_full_counts_are_stable_across_runs() {
    for _ in 0..10 {
        let sb = sandbox();
        fs::create_dir_all(sb.scripts.join("a/b/c/d/e/f")).unwrap();
        fs::create_dir_all(sb.scripts.join("g/h/i/j")).unwrap();

        let (code, json) = run_json(&["sync-full"], &sb.scripts, &sb.data);

        assert_eq!(code, 0);
        assert_eq!(json["created_in_data"], 10);
        assert_eq!(json["created_in_scripts"], 0);
        assert_eq!(json["existing_total"], 10);
    }
}

#[test]
fn sync_full_in_sync_tree_creates_nothing() {
    let sb = sandbox();
    fs::create_dir_all(sb.scripts.join("a/b")).unwrap();
    fs::create_dir_all(sb.data.join("a/b")).unwrap();

    let (code, json) = run_json(&["sync-full"], &sb.scripts, &sb.data);

    assert_eq!(code, 0);
    assert_eq!(json["created_total"], 0);
    assert_eq!(json["existing_total"], 4);
}

#[test]
fn sync_full_reports_file_clash_as_error() {
    let sb = sandbox();
    fs::create_dir_all(sb.scripts.join("results")).unwrap();
    fs::create_dir_all(sb.scripts.join("other")).unwrap();
    fs::write(sb.data.join("results"), "a file, not a folder").unwrap();

    let (code, json) = run_json(&["sync-full"], &sb.scripts, &sb.data);

    assert_eq!(code, 4);
    assert_eq!(json["ok"], false);
    assert_eq!(json["errors"].as_array().unwrap().len(), 1);
    // The rest of the tree is still mirrored.
    assert!(sb.data.join("other").is_dir());
    assert!(sb.data.join("results").is_file());
}

#[test]
fn sync_full_data_path_unavailable() {
    let sb = sandbox();
    let missing = sb.data.join("missing");

    let (code, json) = run_json(&["sync-full"], &sb.scripts, &missing);

    assert_eq!(code, 3);
    assert_eq!(json["ok"], false);
}

#[test]
fn sync_full_invalid_scripts_path_is_json() {
    let sb = sandbox();
    let missing = sb.scripts.join("missing");

    let (code, json) = run_json(&["sync-full"], &missing, &sb.data);

    assert_eq!(code, 2);
    assert_eq!(json["ok"], false);
}

#[test]
fn sync_full_accepts_long_flag_names() {
    let sb = sandbox();
    fs::create_dir_all(sb.scripts.join("a")).unwrap();

    Command::cargo_bin("sandbox-sync")
        .unwrap()
        .arg("sync-full")
        .arg("--scripts-path")
        .arg(&sb.scripts)
        .arg("--data-path")
        .arg(&sb.data)
        .assert()
        .success();

    assert!(sb.data.join("a").is_dir());
}

#[test]
fn ensure_path_creates_both_sides() {
    let sb = sandbox();
    fs::create_dir_all(sb.scripts.join("proj")).unwrap();

    let (code, json) = run_json(
        &["ensure-path", "--relative", "proj/new folder/deep"],
        &sb.scripts,
        &sb.data,
    );

    assert_eq!(code, 0);
    assert_eq!(json["ok"], true);
    assert_eq!(json["created_in_scripts_chain"], 2);
    assert_eq!(json["created_in_data_chain"], 3);
    assert!(sb.scripts.join("proj/new folder/deep").is_dir());
    assert!(sb.data.join("proj/new folder/deep").is_dir());
}

#[test]
fn ensure_path_accepts_empty_relative() {
    let sb = sandbox();

    let (code, json) = run_json(&["ensure-path", "--relative", ""], &sb.scripts, &sb.data);

    assert_eq!(code, 0);
    assert_eq!(json["ok"], true);
    assert_eq!(json["created_in_scripts_chain"], 0);
    assert_eq!(json["created_in_data_chain"], 0);
}

#[test]
fn ensure_path_rejects_traversal() {
    let sb = sandbox();

    let (code, json) = run_json(
        &["ensure-path", "--relative", "../escape"],
        &sb.scripts,
        &sb.data,
    );

    assert_eq!(code, 2);
    assert_eq!(json["ok"], false);
    assert!(!sb.scripts.parent().unwrap().join("escape").exists());
}

#[test]
fn ensure_path_data_path_unavailable() {
    let sb = sandbox();
    let missing = sb.data.join("missing");

    let (code, json) = run_json(
        &["ensure-path", "--relative", "proj"],
        &sb.scripts,
        &missing,
    );

    assert_eq!(code, 3);
    assert_eq!(json["ok"], false);
    // Nothing is created on the scripts side when the data side is missing.
    assert!(!sb.scripts.join("proj").exists());
}
