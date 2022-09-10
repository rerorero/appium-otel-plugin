/**
 * Delegator is a class used to delegate Appium plugin's methods.
 */
export class Delegator {
  async delegateCreateSession(next, driver, jwpDesCaps, jwpReqCaps, caps) {
    return await next();
  }

  async delegateDeleteSession(next, driver, sessionId) {
    return await next();
  }

  async delegateHandle(next, driver, cmdName, ...args) {
    return await next();
  }

  // eslint-disable-next-line require-await
  async delegateOnUnexpectedShutdown(driver, cause) {
    // do nothing
  }
}
