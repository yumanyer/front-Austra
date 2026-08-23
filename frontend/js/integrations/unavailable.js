export const INTEGRATION_STATUS = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
});

export function createUnavailableError(integration) {
  const error = new Error(`${integration} integration is not configured`);
  error.code = INTEGRATION_STATUS.NOT_CONFIGURED;
  return error;
}

export function createUnavailableAdapter(integration, methods = []) {
  const adapter = { status: INTEGRATION_STATUS.NOT_CONFIGURED };
  for (const method of methods) {
    adapter[method] = async () => {
      throw createUnavailableError(integration);
    };
  }
  return adapter;
}
