<script lang="ts">
  /**
   * Login Component
   * Handles Clockify API Key authentication
   */

  import { auth } from '$lib/stores/auth';

  let apiKey = '';
  let isSubmitting = false;

  $: error = $auth.error;
  $: isLoading = $auth.isLoading;

  async function handleSubmit() {
    if (!apiKey.trim()) {
      return;
    }

    isSubmitting = true;
    await auth.setApiKey(apiKey.trim());
    isSubmitting = false;
  }

  function clearError() {
    auth.clearError();
  }
</script>

<div class="login-container">
  <div class="login-card">
    <div class="logo">
      <div class="icon">⏱️</div>
      <h1>Clockify Tracker</h1>
    </div>

    <p class="description">
      Verfolgen Sie Ihre Arbeitszeiten und vergleichen Sie Soll- mit Ist-Stunden.
    </p>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="api-key">Clockify API Key</label>
        <input
          id="api-key"
          type="password"
          bind:value={apiKey}
          placeholder="Ihren API Key eingeben"
          disabled={isLoading}
          on:input={clearError}
          autocomplete="off"
          required
        />
        <small>
          API Key erhalten Sie unter:
          <a
            href="https://app.clockify.me/user/settings"
            target="_blank"
            rel="noopener noreferrer"
          >
            Clockify Einstellungen
          </a>
        </small>
      </div>

      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <button
        type="submit"
        class="btn-primary"
        disabled={isLoading || !apiKey.trim()}
      >
        {#if isLoading}
          Wird überprüft...
        {:else}
          Anmelden
        {/if}
      </button>
    </form>

    <div class="info-box">
      <strong>ℹ️ Info:</strong> Ihr API Key wird sicher in Ihrem Browser gespeichert
      und niemals an Dritte weitergegeben.
    </div>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .login-card {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .logo {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1a202c;
  }

  .description {
    text-align: center;
    color: #718096;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #2d3748;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  input:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }

  small {
    display: block;
    margin-top: 0.5rem;
    color: #718096;
    font-size: 0.875rem;
  }

  small a {
    color: #667eea;
    text-decoration: none;
  }

  small a:hover {
    text-decoration: underline;
  }

  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .error-message {
    padding: 0.75rem;
    background: #fff5f5;
    border: 1px solid #feb2b2;
    border-radius: 0.5rem;
    color: #c53030;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .info-box {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #f0f4ff;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: #4c51bf;
    line-height: 1.5;
  }

  .info-box strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .icon {
      font-size: 2.5rem;
    }
  }
</style>
