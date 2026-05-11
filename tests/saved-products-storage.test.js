const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createElementStub() {
    return {
        classList: {
            contains: () => true,
            remove: () => {}
        },
        appendChild: () => {},
        addEventListener: () => {},
        getContext: () => ({}),
        scrollIntoView: () => {},
        style: {},
        value: 'recent',
        innerHTML: '',
        textContent: ''
    };
}

function bootAppWithSavedProducts(savedProductsValue) {
    const elements = new Map();
    const document = {
        addEventListener(event, callback) {
            if (event === 'DOMContentLoaded') {
                callback();
            }
        },
        createElement: createElementStub,
        getElementById(id) {
            if (!elements.has(id)) {
                elements.set(id, createElementStub());
            }

            return elements.get(id);
        }
    };

    const sandbox = {
        Chart: function Chart() {
            return {
                data: {
                    labels: [],
                    datasets: [{ data: [] }]
                },
                destroy: () => {},
                update: () => {}
            };
        },
        document,
        localStorage: {
            getItem(key) {
                assert.strictEqual(key, 'sustainTrack_products');
                return savedProductsValue;
            },
            setItem: () => {}
        }
    };

    const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    vm.runInNewContext(source, sandbox, { filename: 'app.js' });
}

assert.doesNotThrow(() => bootAppWithSavedProducts('not json'));
assert.doesNotThrow(() => bootAppWithSavedProducts('{"not":"a product array"}'));
assert.doesNotThrow(() => bootAppWithSavedProducts('[]'));

console.log('saved products storage fallback verified');
