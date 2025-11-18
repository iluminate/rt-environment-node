const environment = require('./dist/index.js');

(async () => {
  try {
    const value = await environment.get('4', 'weight_validation_limit_percentage');
    console.log(value);
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await environment.close();
  }
})();