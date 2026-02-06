# Serialization Module

This module provides type-safe JSON serialization and JSONB validation utilities for the Liwanag MVP.

## Features

- **JSON Serialization**: Type-safe serialization and deserialization with UTF-8 encoding
- **Optional Field Handling**: Proper handling of undefined and null values
- **JSONB Validation**: Validation for PostgreSQL JSONB column data
- **Error Handling**: Graceful error handling with custom error types

## Requirements

This module implements:
- **Requirement 13.3**: JSON serialization with UTF-8 encoding
- **Requirement 13.4**: JSONB validation before database storage
- **Requirement 13.5**: Optional field handling during deserialization

## Correctness Properties

This module validates:
- **Property 36**: JSON serialization round-trip preservation
- **Property 37**: JSONB storage validation
- **Property 38**: Optional field handling

## Usage

### JSON Serialization

```typescript
import { serialize, deserialize } from '@/lib/serialization';

// Basic serialization
const data = { email: 'user@example.com', name: 'John' };
const json = serialize(data);

// Deserialization
const parsed = deserialize<typeof data>(json);
```

### Optional Field Handling

```typescript
import { serializeWithOptionals, deserializeWithOptionals } from '@/lib/serialization';

// Serialize with undefined fields removed
const data = { email: 'user@example.com', name: undefined };
const json = serializeWithOptionals(data); // { "email": "user@example.com" }

// Deserialize with defaults
const parsed = deserializeWithOptionals(json, { name: 'Unknown' });
```

### JSONB Validation

```typescript
import { validateJSONB, prepareForJSONB } from '@/lib/serialization';

// Validate data before storing in JSONB column
const webhookPayload = { email: 'user@example.com', metadata: { source: 'newsletter' } };
const validated = validateJSONB(webhookPayload);

// Prepare data for JSONB storage
const prepared = prepareForJSONB(webhookPayload);

// Insert into database
await db.insert(webhookLogs).values({
  payload: prepared,
  // ... other fields
});
```

### Safe Validation

```typescript
import { safeValidateJSONB } from '@/lib/serialization';

// Validate without throwing
const result = safeValidateJSONB(data);
if (result.isValid) {
  console.log('Valid data:', result.data);
} else {
  console.error('Validation error:', result.error);
}
```

## Error Handling

The module provides custom error types:

- `SerializationError`: Thrown when JSON serialization/deserialization fails
- `JSONBValidationError`: Thrown when JSONB validation fails

```typescript
import { SerializationError, JSONBValidationError } from '@/lib/serialization';

try {
  const data = serialize(circularReference);
} catch (error) {
  if (error instanceof SerializationError) {
    console.error('Serialization failed:', error.message);
  }
}
```

## Testing

The module includes comprehensive property-based tests using fast-check:

```bash
# Run all serialization tests
npm test -- serialization

# Run JSON serialization tests
npm test -- json.property.test.ts

# Run JSONB validation tests
npm test -- jsonb.property.test.ts
```

## Implementation Notes

### JavaScript Quirks Handled

1. **-0 vs +0**: JSON.stringify converts -0 to 0, so tests filter out -0
2. **Undefined vs Null**: undefined is omitted in JSON, null is preserved
3. **Functions and Symbols**: Cannot be serialized, are omitted
4. **Circular References**: Throw SerializationError

### JSONB Compatibility

PostgreSQL JSONB columns can store:
- Objects
- Arrays
- Strings
- Numbers
- Booleans
- null

All of these are validated by the module before storage.
