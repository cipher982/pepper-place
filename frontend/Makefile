.PHONY: dev clean install build test lint

# Start development server with hot reload
dev:
	@echo "Starting development server with hot reload..."
	@BROWSER=none npm start

# Clean build artifacts and caches
clean:
	@echo "Cleaning build artifacts and caches..."
	@rm -rf build node_modules/.cache .eslintcache
	@echo "Clean complete"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@npm install

# Production build
build:
	@echo "Building production bundle..."
	@npm run build

# Run tests
test:
	@npm test

# Run linter
lint:
	@npm run lint

# Full clean rebuild
rebuild: clean install build
	@echo "Rebuild complete"

# Check current status
status:
	@echo "=== Git Status ==="
	@git status --short
	@echo ""
	@echo "=== Port 3000 Status ==="
	@lsof -ti:3000 && echo "Port 3000 in use" || echo "Port 3000 available"
	@echo ""
	@echo "=== npm audit ==="
	@npm audit --audit-level=high 2>&1 | head -10
