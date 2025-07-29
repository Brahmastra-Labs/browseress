'use strict'

var assert = require('node:assert')
var util = require('../lib/polyfills/util-stub')

describe('polyfills', function(){
  describe('util stub', function(){
    describe('.inherits()', function(){
      it('should set up prototype chain', function(){
        function Parent() {
          this.parentProp = 'parent'
        }
        Parent.prototype.parentMethod = function() {
          return 'from parent'
        }

        function Child() {
          Parent.call(this)
          this.childProp = 'child'
        }
        
        util.inherits(Child, Parent)
        
        var child = new Child()
        assert.strictEqual(child.parentProp, 'parent')
        assert.strictEqual(child.childProp, 'child')
        assert.strictEqual(child.parentMethod(), 'from parent')
        assert.ok(child instanceof Child)
        assert.ok(child instanceof Parent)
      })

      it('should set super_ property', function(){
        function Parent() {}
        function Child() {}
        
        util.inherits(Child, Parent)
        assert.strictEqual(Child.super_, Parent)
      })

      it('should throw on null/undefined constructor', function(){
        function Parent() {}
        
        assert.throws(function(){
          util.inherits(null, Parent)
        }, /constructor.*must not be null or undefined/)
        
        assert.throws(function(){
          util.inherits(undefined, Parent)
        }, /constructor.*must not be null or undefined/)
      })

      it('should throw on null/undefined superConstructor', function(){
        function Child() {}
        
        assert.throws(function(){
          util.inherits(Child, null)
        }, /super constructor.*must not be null or undefined/)
        
        assert.throws(function(){
          util.inherits(Child, undefined)
        }, /super constructor.*must not be null or undefined/)
      })

      it('should throw if superConstructor has no prototype', function(){
        function Child() {}
        var NotAConstructor = {}
        
        assert.throws(function(){
          util.inherits(Child, NotAConstructor)
        }, /super constructor.*must have a prototype/)
      })
    })

    describe('.isArray()', function(){
      it('should identify arrays', function(){
        assert.strictEqual(util.isArray([]), true)
        assert.strictEqual(util.isArray([1, 2, 3]), true)
        assert.strictEqual(util.isArray(new Array()), true)
      })

      it('should reject non-arrays', function(){
        assert.strictEqual(util.isArray({}), false)
        assert.strictEqual(util.isArray('array'), false)
        assert.strictEqual(util.isArray(123), false)
        assert.strictEqual(util.isArray(null), false)
        assert.strictEqual(util.isArray(undefined), false)
        assert.strictEqual(util.isArray(arguments), false)
      })
    })

    describe('.isDate()', function(){
      it('should identify dates', function(){
        assert.strictEqual(util.isDate(new Date()), true)
        assert.strictEqual(util.isDate(new Date('2024-01-01')), true)
      })

      it('should reject non-dates', function(){
        assert.strictEqual(util.isDate(Date.now()), false)
        assert.strictEqual(util.isDate('2024-01-01'), false)
        assert.strictEqual(util.isDate({}), false)
        assert.strictEqual(util.isDate(null), false)
      })
    })

    describe('.isError()', function(){
      it('should identify errors', function(){
        assert.strictEqual(util.isError(new Error()), true)
        assert.strictEqual(util.isError(new TypeError()), true)
        assert.strictEqual(util.isError(new RangeError()), true)
      })

      it('should reject non-errors', function(){
        assert.strictEqual(util.isError({}), false)
        assert.strictEqual(util.isError({ message: 'fake error' }), false)
        assert.strictEqual(util.isError('error'), false)
        assert.strictEqual(util.isError(null), false)
      })
    })

    describe('.isFunction()', function(){
      it('should identify functions', function(){
        assert.strictEqual(util.isFunction(function(){}), true)
        assert.strictEqual(util.isFunction(() => {}), true)
        assert.strictEqual(util.isFunction(Date), true)
        assert.strictEqual(util.isFunction(Object), true)
      })

      it('should reject non-functions', function(){
        assert.strictEqual(util.isFunction({}), false)
        assert.strictEqual(util.isFunction('function'), false)
        assert.strictEqual(util.isFunction(123), false)
        assert.strictEqual(util.isFunction(null), false)
      })
    })

    describe('.isNull()', function(){
      it('should identify null', function(){
        assert.strictEqual(util.isNull(null), true)
      })

      it('should reject non-null values', function(){
        assert.strictEqual(util.isNull(undefined), false)
        assert.strictEqual(util.isNull(0), false)
        assert.strictEqual(util.isNull(''), false)
        assert.strictEqual(util.isNull(false), false)
        assert.strictEqual(util.isNull({}), false)
      })
    })

    describe('.isUndefined()', function(){
      it('should identify undefined', function(){
        assert.strictEqual(util.isUndefined(undefined), true)
        assert.strictEqual(util.isUndefined(void 0), true)
      })

      it('should reject defined values', function(){
        assert.strictEqual(util.isUndefined(null), false)
        assert.strictEqual(util.isUndefined(0), false)
        assert.strictEqual(util.isUndefined(''), false)
        assert.strictEqual(util.isUndefined(false), false)
      })
    })

    describe('.isObject()', function(){
      it('should identify objects', function(){
        assert.strictEqual(util.isObject({}), true)
        assert.strictEqual(util.isObject(new Date()), true)
        assert.strictEqual(util.isObject([]), true)
        assert.strictEqual(util.isObject(/regex/), true)
      })

      it('should reject non-objects', function(){
        assert.strictEqual(util.isObject(null), false)
        assert.strictEqual(util.isObject(undefined), false)
        assert.strictEqual(util.isObject('string'), false)
        assert.strictEqual(util.isObject(123), false)
        assert.strictEqual(util.isObject(true), false)
      })
    })

    describe('.isString()', function(){
      it('should identify strings', function(){
        assert.strictEqual(util.isString(''), true)
        assert.strictEqual(util.isString('hello'), true)
        assert.strictEqual(util.isString(String('test')), true)
      })

      it('should reject non-strings', function(){
        assert.strictEqual(util.isString(123), false)
        assert.strictEqual(util.isString({}), false)
        assert.strictEqual(util.isString(null), false)
        assert.strictEqual(util.isString(undefined), false)
      })
    })

    describe('.isNumber()', function(){
      it('should identify numbers', function(){
        assert.strictEqual(util.isNumber(0), true)
        assert.strictEqual(util.isNumber(123), true)
        assert.strictEqual(util.isNumber(-456), true)
        assert.strictEqual(util.isNumber(3.14), true)
        assert.strictEqual(util.isNumber(NaN), true)
        assert.strictEqual(util.isNumber(Infinity), true)
      })

      it('should reject non-numbers', function(){
        assert.strictEqual(util.isNumber('123'), false)
        assert.strictEqual(util.isNumber({}), false)
        assert.strictEqual(util.isNumber(null), false)
        assert.strictEqual(util.isNumber(undefined), false)
      })
    })

    describe('.isSymbol()', function(){
      it('should identify symbols', function(){
        assert.strictEqual(util.isSymbol(Symbol()), true)
        assert.strictEqual(util.isSymbol(Symbol('test')), true)
        assert.strictEqual(util.isSymbol(Symbol.for('test')), true)
      })

      it('should reject non-symbols', function(){
        assert.strictEqual(util.isSymbol('symbol'), false)
        assert.strictEqual(util.isSymbol(123), false)
        assert.strictEqual(util.isSymbol({}), false)
        assert.strictEqual(util.isSymbol(null), false)
      })
    })

    describe('.isNullOrUndefined()', function(){
      it('should identify null or undefined', function(){
        assert.strictEqual(util.isNullOrUndefined(null), true)
        assert.strictEqual(util.isNullOrUndefined(undefined), true)
        assert.strictEqual(util.isNullOrUndefined(void 0), true)
      })

      it('should reject other values', function(){
        assert.strictEqual(util.isNullOrUndefined(0), false)
        assert.strictEqual(util.isNullOrUndefined(''), false)
        assert.strictEqual(util.isNullOrUndefined(false), false)
        assert.strictEqual(util.isNullOrUndefined({}), false)
      })
    })

    describe('.deprecate()', function(){
      it('should return the function unchanged', function(){
        var fn = function() { return 'test' }
        var deprecated = util.deprecate(fn, 'This is deprecated')
        assert.strictEqual(deprecated, fn)
        assert.strictEqual(deprecated(), 'test')
      })
    })

    describe('.format()', function(){
      it('should format strings with %s', function(){
        assert.strictEqual(util.format('Hello %s', 'World'), 'Hello World')
        assert.strictEqual(util.format('%s %s', 'Hello', 'World'), 'Hello World')
      })

      it('should format numbers with %d', function(){
        assert.strictEqual(util.format('Count: %d', 42), 'Count: 42')
        assert.strictEqual(util.format('%d + %d = %d', 1, 2, 3), '1 + 2 = 3')
      })

      it('should format JSON with %j', function(){
        assert.strictEqual(util.format('Data: %j', { foo: 'bar' }), 'Data: {"foo":"bar"}')
        assert.strictEqual(util.format('Array: %j', [1, 2, 3]), 'Array: [1,2,3]')
      })

      it('should handle %% as literal %', function(){
        assert.strictEqual(util.format('100%%'), '100%')
        assert.strictEqual(util.format('%d%% complete', 50), '50% complete')
      })

      it('should append extra arguments', function(){
        assert.strictEqual(util.format('Hello', 'World', '!'), 'Hello World !')
        assert.strictEqual(util.format('%s', 'One', 'Two', 'Three'), 'One Two Three')
      })

      it('should handle missing arguments', function(){
        assert.strictEqual(util.format('%s %s', 'Hello'), 'Hello %s')
        assert.strictEqual(util.format('%d %d %d', 1, 2), '1 2 %d')
      })
    })

    describe('.inspect()', function(){
      it('should return JSON string', function(){
        assert.strictEqual(util.inspect({ foo: 'bar' }), '{"foo":"bar"}')
        assert.strictEqual(util.inspect([1, 2, 3]), '[1,2,3]')
        assert.strictEqual(util.inspect('string'), '"string"')
        assert.strictEqual(util.inspect(123), '123')
        assert.strictEqual(util.inspect(true), 'true')
      })
    })
  })
})