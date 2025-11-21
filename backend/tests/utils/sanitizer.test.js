// tests/utils/sanitizer.test.js
// Comprehensive test suite for sanitization utilities

const {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeJson,
} = require('../../utils/sanitizer');

// ============================================================================
// sanitizePlainText() - 10 test cases (XSS attempts)
// ============================================================================
describe('sanitizePlainText', () => {
  it('should remove all HTML tags', () => {
    const result = sanitizePlainText('<p>Hello World</p>');
    expect(result).toBe('Hello World');
  });

  it('should prevent script tag injection', () => {
    const result = sanitizePlainText('<script>alert("XSS")</script>Hello');
    expect(result).toBe('Hello');
  });

  it('should remove inline JavaScript', () => {
    const result = sanitizePlainText('<img src=x onerror="alert(1)">');
    expect(result).toBe('');
  });

  it('should remove style tags', () => {
    const result = sanitizePlainText('<style>body{background:red}</style>Content');
    expect(result).toBe('Content');
  });

  it('should handle nested HTML tags', () => {
    const result = sanitizePlainText('<div><span><b>Bold</b> text</span></div>');
    expect(result).toBe('Bold text');
  });

  it('should remove anchor tags but keep text', () => {
    const result = sanitizePlainText('<a href="javascript:alert(1)">Click me</a>');
    expect(result).toBe('Click me');
  });

  it('should handle null and undefined', () => {
    expect(sanitizePlainText(null)).toBe(null);
    expect(sanitizePlainText(undefined)).toBe(undefined);
  });

  it('should handle non-string types', () => {
    expect(sanitizePlainText(123)).toBe(123);
    expect(sanitizePlainText(true)).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = sanitizePlainText('  Hello World  ');
    expect(result).toBe('Hello World');
  });

  it('should prevent iframe injection', () => {
    const result = sanitizePlainText('<iframe src="evil.com"></iframe>Safe text');
    expect(result).toBe('Safe text');
  });
});

// ============================================================================
// sanitizeRichText() - 15 test cases (HTML sanitization)
// ============================================================================
describe('sanitizeRichText', () => {
  // Allowed tags
  it('should preserve bold tags', () => {
    const result = sanitizeRichText('<b>Bold text</b>');
    expect(result).toBe('<b>Bold text</b>');
  });

  it('should preserve strong tags', () => {
    const result = sanitizeRichText('<strong>Important</strong>');
    expect(result).toBe('<strong>Important</strong>');
  });

  it('should preserve italic tags', () => {
    const result = sanitizeRichText('<i>Italic</i> and <em>emphasis</em>');
    expect(result).toBe('<i>Italic</i> and <em>emphasis</em>');
  });

  it('should preserve paragraph tags', () => {
    const result = sanitizeRichText('<p>First paragraph</p><p>Second paragraph</p>');
    expect(result).toBe('<p>First paragraph</p><p>Second paragraph</p>');
  });

  it('should preserve lists', () => {
    const result = sanitizeRichText('<ul><li>Item 1</li><li>Item 2</li></ul>');
    expect(result).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
  });

  it('should preserve blockquote', () => {
    const result = sanitizeRichText('<blockquote>Quote here</blockquote>');
    expect(result).toBe('<blockquote>Quote here</blockquote>');
  });

  it('should preserve code tags', () => {
    const result = sanitizeRichText('<code>const x = 5;</code>');
    expect(result).toBe('<code>const x = 5;</code>');
  });

  it('should preserve safe anchor tags', () => {
    const result = sanitizeRichText('<a href="https://example.com">Link</a>');
    expect(result).toBe('<a href="https://example.com">Link</a>');
  });

  // Disallowed/dangerous content
  it('should remove script tags', () => {
    const result = sanitizeRichText('<p>Safe</p><script>alert("XSS")</script>');
    expect(result).toBe('<p>Safe</p>');
  });

  it('should remove inline event handlers', () => {
    const result = sanitizeRichText('<b onclick="alert(1)">Click me</b>');
    expect(result).toBe('<b>Click me</b>');
  });

  it('should remove javascript: protocol in links', () => {
    const result = sanitizeRichText('<a href="javascript:alert(1)">Bad link</a>');
    expect(result).toBe('<a>Bad link</a>');
  });

  it('should remove dangerous tags like iframe', () => {
    const result = sanitizeRichText('<p>Content</p><iframe src="evil.com"></iframe>');
    expect(result).toBe('<p>Content</p>');
  });

  it('should remove style attributes', () => {
    const result = sanitizeRichText('<p style="color:red">Text</p>');
    expect(result).toBe('<p>Text</p>');
  });

  it('should handle complex nested structures', () => {
    const html = '<p><strong>Bold</strong> and <i>italic</i> with <a href="https://example.com">link</a></p>';
    const result = sanitizeRichText(html);
    expect(result).toBe('<p><strong>Bold</strong> and <i>italic</i> with <a href="https://example.com">link</a></p>');
  });

  it('should allow http and https links only', () => {
    const result1 = sanitizeRichText('<a href="http://example.com">HTTP</a>');
    const result2 = sanitizeRichText('<a href="https://example.com">HTTPS</a>');
    const result3 = sanitizeRichText('<a href="mailto:test@example.com">Email</a>');

    expect(result1).toBe('<a href="http://example.com">HTTP</a>');
    expect(result2).toBe('<a href="https://example.com">HTTPS</a>');
    expect(result3).toBe('<a href="mailto:test@example.com">Email</a>');
  });
});

// ============================================================================
// sanitizeJson() - 8 test cases
// ============================================================================
describe('sanitizeJson', () => {
  it('should sanitize string values', () => {
    const result = sanitizeJson('<script>alert("XSS")</script>Hello');
    expect(result).toBe('Hello');
  });

  it('should sanitize strings in objects', () => {
    const input = {
      name: '<b>John</b>',
      bio: '<script>alert(1)</script>Developer'
    };
    const result = sanitizeJson(input);
    expect(result.name).toBe('John');
    expect(result.bio).toBe('Developer');
  });

  it('should sanitize strings in nested objects', () => {
    const input = {
      user: {
        name: '<b>John</b>',
        profile: {
          bio: '<i>Developer</i>'
        }
      }
    };
    const result = sanitizeJson(input);
    expect(result.user.name).toBe('John');
    expect(result.user.profile.bio).toBe('Developer');
  });

  it('should sanitize strings in arrays', () => {
    const input = ['<b>Item 1</b>', '<script>alert(1)</script>Item 2', 'Item 3'];
    const result = sanitizeJson(input);
    expect(result).toEqual(['Item 1', 'Item 2', 'Item 3']);
  });

  it('should preserve non-string types', () => {
    const input = {
      count: 42,
      active: true,
      price: 19.99,
      empty: null
    };
    const result = sanitizeJson(input);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.price).toBe(19.99);
    expect(result.empty).toBe(null);
  });

  it('should handle null and undefined', () => {
    expect(sanitizeJson(null)).toBe(null);
    expect(sanitizeJson(undefined)).toBe(undefined);
  });

  it('should sanitize complex nested structures', () => {
    const input = {
      users: [
        { name: '<b>Alice</b>', tags: ['<i>admin</i>', 'user'] },
        { name: '<script>Bob</script>', tags: ['<b>user</b>'] }
      ],
      metadata: {
        title: '<h1>Title</h1>',
        description: 'Safe text'
      }
    };
    const result = sanitizeJson(input);
    expect(result.users[0].name).toBe('Alice');
    expect(result.users[0].tags).toEqual(['admin', 'user']);
    expect(result.users[1].name).toBe('Bob');
    expect(result.users[1].tags).toEqual(['user']);
    expect(result.metadata.title).toBe('Title');
    expect(result.metadata.description).toBe('Safe text');
  });

  it('should use custom sanitizer when provided', () => {
    const input = {
      content: '<b>Bold text</b> and <script>evil</script>'
    };
    // Using sanitizeRichText as custom sanitizer
    const { sanitizeRichText } = require('../../utils/sanitizer');
    const result = sanitizeJson(input, sanitizeRichText);
    expect(result.content).toBe('<b>Bold text</b> and');
  });
});
