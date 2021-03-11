const fs = require('fs');

const callbacks = [];
const continuations = [];

module.exports = {
  register: (callback = (lastCheckTime = 0) => { }, ...then) => {
    callbacks.push(callback);
    continuations.push(then);
  },
  unregister: (callback) => {
    continuations.splice(callbacks.indexOf(callback), 1);
    callbacks.splice(callbacks.indexOf(callback), 1);
  },
  poll: (pollDelay = 0) => {
    let end = false;
    
    const polling = async () => {
      while (!end) {
        // Allow processing beforehand.
        await new Promise((resolve) => setImmediate(resolve));
        const now = Date.now();
        let lastCheck = -1;

        if (fs.existsSync('.lastcheck')) {
          lastCheck = parseInt(fs.readFileSync('.lastcheck'));
        }

        // Trigger all the callbacks and wait for them to complete.
        try {
          if (callbacks.length) {
            await Promise.all(callbacks.map((callback, c) => {
              const continuation = continuations[c];
              let promise = callback(lastCheck);

              for (let i = 0; i < continuation.length; i++) {
                promise = promise.then(continuation[i]);
              }

              return promise;
            }));
          }

          fs.writeFileSync('.lastcheck', now.toString());

          // Delay, if any.
          if (pollDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, pollDelay));
          }
        } catch (e) {
          // One or more callbacks failed. Don't regard the update as completed.
          console.error('Callback failure', e);
        }
      }
    };

    polling();

    return {
      complete: () => {
        end = true;
      },
    };
  },
};
