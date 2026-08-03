export const serializeError = (error: any) => ({
  message: error?.message,
  stack: error?.stack,
})

export const addKnownErrorConstructor = () => {}
