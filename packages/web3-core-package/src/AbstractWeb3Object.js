/*
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @file AbstractWeb3Object.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @date 2018
 */

"use strict";

/**
 * @param {Object} provider
 * @param {ProvidersPackage} providersPackage
 * @param {Accounts} accounts
 * @param {MethodService} methodService
 * @param {MethodModelFactory} methodModelFactory
 * @param {SubscriptionPackage} subscriptionPackage
 * @param {BatchRequest} batchRequest
 *
 * @constructor
 */
function AbstractWeb3Object(
    provider,
    providersPackage,
    accounts,
    methodService,
    methodModelFactory,
    subscriptionPackage,
    batchRequest
) {
    this.methodModelFactory = methodModelFactory;
    this.methodService = methodService;
    this.accounts = accounts;
    this.providersPackage = providersPackage;
    this._provider = this.providersPackage.resolve(provider);
    this.givenProvider = this.providersPackage.detect();

    this.providers = {
        HttpProvider: this.providersPackage.HttpProvider,
        IpcProvider: this.providersPackage.IpcProvider,
        WebsocketProvider: this.providersPackage.WebsocketProvider,
    };

    if (typeof batchRequest !== 'undefined') {
        this.BatchRequest = batchRequest;
    }

    if (typeof methodPackage !== 'undefined') {
        this.methodPackage = methodPackage;
    }

    if (typeof subscriptionPackage !== 'undefined') {
        this.subscriptionPackage = subscriptionPackage;
    }

    Object.defineProperty(this, 'currentProvider', {
        get: function() {
            return this._provider;
        },
        set: function (provider) {
            if (typeof this._provider.clearSubscriptions !== 'undefined' && this._provider.subscriptions.length > 0) {
                this._provider.clearSubscriptions();
            }

            this._provider = this.providersPackage.resolve(provider);
        },
        enumerable: true
    });

    return new Proxy(this,
        {
            get: this.proxyHandler
        }
    )
}

/**
 * Sets the currentProvider and provider property
 *
 * @method setProvider
 *
 * @param {any} provider
 */
AbstractWeb3Object.prototype.setProvider = function (provider) {
    this.currentProvider = provider;
};

/**
 * Clears all subscriptions and listeners of the provider if it has any subscriptions
 *
 * @method clearSubscriptions
 */
AbstractWeb3Object.prototype.clearSubscriptions = function() {
    if (typeof this.currentProvider.clearSubscriptions !== 'undefined' && this.currentProvider.subscriptions.length > 0) {
        this.currentProvider.clearSubscriptions();
    }
};

/**
 * Extends the current object with JSON-RPC methods
 *
 * @method extend
 *
 * @param {Object} extension
 */
AbstractWeb3Object.prototype.extend = function (extension) {
    var namespace = extension.property || false,
        extendedObject,
        self = this;

    if (namespace) {
        extendedObject = this[namespace] = {};
    } else {
        extendedObject = this;
    }

    if (extension.methods.length > 0) {
        extension.methods.forEach(function(method) {
           extendedObject[method.name] = function () {
               var parameters = null;
               var callback = arguments[0];

               if (method.params && method.params > 0) {
                   parameters = arguments.slice(0, (method.params - 1 ));
                   callback = arguments.slice(-1);
               }

               return this.methodPackage.create(
                   self.currentProvider,
                   method.call,
                   parameters,
                   method.inputFormatter,
                   method.outputFormatter
               ).send(callback);
           };
        });
    }
};

AbstractWeb3Object.prototype.proxyHandler = function(target, name) {
    if (target.methodModelFactory.hasMethodModel(name)) {
        var methodModel = target.methodModelFactory.createMethodModel(name);

        var anonymousFunction = function() {
            return target.methodService.execute(
                methodModel,
                target.currentProvider,
                target.accounts,
                arguments
            );
        };

        anonymousFunction.methodModel = methodModel;
        anonymousFunction.request = methodModel.request;

        return anonymousFunction;
    }

    return target[name];
};


module.exports = AbstractWeb3Object;