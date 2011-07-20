module.exports = Semaphore;

/**
 * @class Semaphore is an async helper used when multiple potential async paths need to complete before a common callback gets executed
 */
function Semaphore(callback, context) {
  this.semaphore = 0;
  this.callback = callback;
  this.context = context || this;
}

Semaphore.prototype = /** @lends Semaphore.prototype */ {

  /**
   * Increments the semaphore by amount.
   * @param {number} amount If omitted, defaults to 1.
   */
  increment: function(amount) {
    if (amount === undefined) {
      amount = 1;
    }
    this.semaphore += amount;
  },
  
  /**
   * Decrements the semaphore value by one, then, if value is zero, executes the callback.
   */
  execute: function() {
    this.semaphore--;
    if (this.semaphore == 0 && this.callback) {
      var ret = this.callback.apply(this.context, arguments); //this means that the args that actually reach the callback will be from the LAST call to .execute();
      this.dispose();
      return ret;
    }
  },
  /**
   * Disposes of this semaphore instance.
   */
  dispose: function() {
    delete this.semaphore;
    delete this.callback;
    delete this.context;
  }
};