/**
 * Example Frontend Component Test
 * Tests for the main App component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the AppWhistler title', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <App />
      </MockedProvider>
    );

    // Check if the main title is rendered
    const titleElement = screen.getByText(/AppWhistler/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('toggles dark mode when button is clicked', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <App />
      </MockedProvider>
    );

    // Initial state should not have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Find and click dark mode toggle button
    const darkModeButton = screen.getByRole('button', { name: /moon|sun/i });
    fireEvent.click(darkModeButton);

    // After toggle, should have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Check localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
  });

  it('persists dark mode preference from localStorage', () => {
    // Set dark mode in localStorage before rendering
    localStorage.getItem.mockReturnValue('true');

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <App />
      </MockedProvider>
    );

    // Should read from localStorage on mount
    expect(localStorage.getItem).toHaveBeenCalledWith('darkMode');
  });

  it('renders search input', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <App />
      </MockedProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('updates search query on input change', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <App />
      </MockedProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search/i);

    fireEvent.change(searchInput, { target: { value: 'Facebook' } });

    expect(searchInput.value).toBe('Facebook');
  });
});
