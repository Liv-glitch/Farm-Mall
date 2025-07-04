# Test Structure & Organization

## 🏗️ **Recommended Test Directory Structure**

```
tests/
├── unit/                    # Fast, isolated tests (no external dependencies)
│   ├── auth/
│   │   ├── auth.service.test.ts
│   │   ├── auth.controller.test.ts
│   │   └── auth.middleware.test.ts
│   ├── calculator/
│   ├── production/
│   └── utils/
├── integration/             # Tests with external dependencies (DB, APIs)
│   ├── auth/
│   │   ├── auth.routes.test.ts
│   │   └── auth.workflows.test.ts
│   ├── calculator/
│   └── production/
├── performance/             # Load, stress, and performance tests
│   ├── auth/
│   │   ├── auth.load.test.ts
│   │   └── auth.stress.test.ts
│   ├── calculator/
│   └── production/
├── e2e/                     # End-to-end tests (full user journeys)
│   ├── auth.e2e.test.ts
│   ├── calculator.e2e.test.ts
│   └── production.e2e.test.ts
├── fixtures/                # Test data and mocks
│   ├── users.fixture.ts
│   ├── calculator.fixture.ts
│   └── production.fixture.ts
├── helpers/                 # Test utilities and common functions
│   ├── test-server.ts
│   ├── db-helpers.ts
│   └── mock-helpers.ts
├── setup/                   # Test configuration and setup
│   ├── jest.config.ts
│   ├── test-db.ts
│   └── global-setup.ts
└── complete/                # Complete feature tests (all layers)
    ├── auth.complete.test.ts    ← This is what we'll create!
    ├── calculator.complete.test.ts
    └── production.complete.test.ts
```

## 🎯 **Test Types & Purposes**

### **Unit Tests** (`tests/unit/`)
- **Purpose**: Test individual functions/classes in isolation
- **Speed**: Very fast (< 100ms each)
- **Dependencies**: Mocked/stubbed
- **Coverage**: Business logic, validation, utilities

### **Integration Tests** (`tests/integration/`)
- **Purpose**: Test component interactions (routes + controllers + services)
- **Speed**: Medium (100ms - 1s each)
- **Dependencies**: Real DB, mocked external APIs
- **Coverage**: API endpoints, database operations

### **Performance Tests** (`tests/performance/`)
- **Purpose**: Test system under load
- **Speed**: Slow (seconds to minutes)
- **Dependencies**: Production-like environment
- **Coverage**: Response times, throughput, memory usage

### **E2E Tests** (`tests/e2e/`)
- **Purpose**: Test complete user workflows
- **Speed**: Slowest (multiple seconds each)
- **Dependencies**: Full application stack
- **Coverage**: Critical user journeys

### **Complete Tests** (`tests/complete/`)
- **Purpose**: Test entire feature from all angles in one test
- **Speed**: Medium-slow (1-5s each)
- **Dependencies**: Mix of real and mocked
- **Coverage**: Full feature validation (unit + integration + workflows)

## 🚀 **Running Tests**

```bash
# Run all tests
npm test

# Run by type
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:e2e

# Run by feature
npm test -- --testPathPattern=auth
npm test -- --testPathPattern=calculator

# Run complete feature tests
npm test -- --testPathPattern=complete

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📋 **Test Naming Conventions**

- **Unit**: `*.test.ts` or `*.spec.ts`
- **Integration**: `*.integration.test.ts`
- **Performance**: `*.load.test.ts`, `*.stress.test.ts`
- **E2E**: `*.e2e.test.ts`
- **Complete**: `*.complete.test.ts`

## 🎯 **Best Practices**

1. **Test Pyramid**: More unit tests, fewer E2E tests
2. **Fast Feedback**: Unit tests should run in < 5 seconds total
3. **Isolation**: Each test should be independent
4. **Clear Names**: Test names should describe expected behavior
5. **Setup/Teardown**: Clean state between tests
6. **Fixtures**: Reusable test data
7. **Helpers**: Common test utilities 