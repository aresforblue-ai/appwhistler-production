const {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeStringArray,
  sanitizeJson
} = require('../../../src/backend/utils/sanitizer');

describe('sanitizer utils', () => {
  test('sanitizePlainText removes tags and trims', () => {
    const result = sanitizePlainText('  <script>alert(1)</script>Hello  ');
    expect(result).toBe('Hello');
  });

  test('sanitizeRichText keeps whitelisted tags', () => {
    const html = '<p><strong>Trusted</strong> <em>content</em></p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  test('sanitizeStringArray strips falsy and sanitizes each entry', () => {
    const values = [' <b>a</b> ', null, undefined, '  '];
    const sanitized = sanitizeStringArray(values);
    expect(sanitized).toEqual(['a']);
  });

  test('sanitizeJson recursively sanitizes objects and arrays', () => {
    const input = {
      text: '<script>bad()</script>ok',
      nested: {
        arr: ['<div>good</div>', 42]
      }
    };

    const result = sanitizeJson(input);
    expect(result.text).toBe('ok');
    expect(result.nested.arr[0]).toBe('good');
    expect(result.nested.arr[1]).toBe(42);
  });
});
