# Contributing to Sandbox Sync

Thank you for your interest in contributing to Sandbox Sync!

## Development Setup

### Prerequisites

- Rust 1.70 or later
- Node.js 18 or later
- Git
- Docker (optional, for containerized development)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/sandbox-sync.git
   cd sandbox-sync
   ```

2. **Build the Rust binary:**
   ```bash
   cd sandbox-sync
   cargo build
   cargo test
   ```

3. **Build the extension:**
   ```bash
   cd sandbox-switcher
   npm install
   npm run compile
   ```

### Docker Development

1. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your paths
   ```

2. **Start container:**
   ```bash
   docker-compose up -d
   docker exec -it sandbox-sync-dev bash
   ```

3. **Inside container:**
   ```bash
   cargo build --release
   cargo test
   ```

## Project Structure

- `sandbox-sync/` - Rust binary source code
- `sandbox-switcher/` - Positron extension source code
- `examples/` - Example configurations (.Rprofile, config.json)
- `docs/` - User documentation
- `tests/` - Integration tests

## Coding Standards

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Run `cargo fmt` before committing
- Run `cargo clippy` and address warnings
- Add tests for new functionality
- Document public APIs

### TypeScript

- Follow standard TypeScript conventions
- Use meaningful variable names
- Add comments for complex logic
- Test extension commands manually in Positron/VS Code

## Testing

### Rust Binary

```bash
cd sandbox-sync
cargo test              # Unit tests
cargo test --release    # Release mode tests
```

### Extension

```bash
cd sandbox-switcher
npm run compile
# Manual testing in Positron required
```

### Integration Testing

```bash
# Use Docker test environment
docker-compose up -d
docker exec -it sandbox-sync-dev bash

# Run integration tests
./target/release/sandbox-sync --scripts /test-scripts --data /test-data sync
./target/release/sandbox-sync --scripts /test-scripts --data /test-data check
```

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clear, concise commit messages
   - Add tests if applicable
   - Update documentation if needed

3. **Test thoroughly:**
   - Run all tests
   - Test manually in your environment
   - Check cross-platform compatibility if possible

4. **Submit PR:**
   - Describe what your changes do
   - Reference any related issues
   - List any breaking changes

5. **Code review:**
   - Address feedback
   - Keep commits clean and focused

## Reporting Issues

When reporting bugs, please include:

- OS and version (Windows 10, macOS 13, Ubuntu 22.04, etc.)
- Rust version (`rustc --version`)
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or error messages

## Feature Requests

We welcome feature requests! Please:

- Check if it's already been requested
- Describe the use case clearly
- Explain why it would be useful
- Consider submitting a PR yourself

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help create a positive community

## Questions?

- Open a GitHub issue for bugs or feature requests
- Check existing issues and documentation first
- Be patient - this is a community project

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing!
