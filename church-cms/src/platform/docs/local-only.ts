/** Docs/Swagger are local & preview only (RentFlow-style). */
export function isApiDocsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function docsDisabledResponse(): Response {
  return Response.json(
    {
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'API docs are unavailable in production',
    },
    { status: 404 },
  );
}
