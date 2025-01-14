/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const fs = require('fs');

const ModelManager = require('../lib/modelmanager');
const Serializer = require('../lib/serializer');
const Factory = require('../lib/factory');

const chai = require('chai');
chai.should();
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
const sinon = require('sinon');

describe('Semantic Versioning', () => {
    let sandbox;
    let modelManager;
    let personCto;
    let employeeCto;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        personCto = fs.readFileSync('./test/data/semver/person.cto', 'utf-8');
        employeeCto = fs.readFileSync('./test/data/semver/employee.cto', 'utf-8');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#namespace versioning - versionedNamespacesStrict:false', () => {
        it('should support versioned namespaces', () => {
            modelManager = new ModelManager();
            modelManager.addCTOModel(personCto, 'person.cto');
            modelManager.addCTOModel(employeeCto, 'employee.cto');
            modelManager.getModelFile('person@1.0.0').should.be.not.null;
            modelManager.getModelFile('employee@2.0.0').should.be.not.null;
        });
        it('should serialize versioned declarations', () => {
            modelManager = new ModelManager();
            modelManager.addCTOModel(personCto, 'person.cto');
            const factory = new Factory(modelManager);
            const serializer = new Serializer(factory, modelManager);
            const person = factory.newConcept('person@1.0.0', 'Person', 'john.doe@example.com');
            const json = serializer.toJSON(person);
            json.should.deep.equal({
                $class: 'person@1.0.0.Person',
                email: 'john.doe@example.com',
            });
            const person2 = serializer.fromJSON(json);
            person2.email.should.equal(person.email);
        });
        it('should support unversioned namespaces', () => {
            modelManager = new ModelManager();
            modelManager.addCTOModel('namespace test', 'test.cto');
        });
        it('should serialize unversioned declarations', () => {
            modelManager = new ModelManager();
            modelManager.addCTOModel(`namespace test
concept Person identified by email {
    o String email
}
            `, 'test.cto');
            const factory = new Factory(modelManager);
            const serializer = new Serializer(factory, modelManager);
            const person = factory.newConcept('test', 'Person', 'john.doe@example.com');
            const json = serializer.toJSON(person);
            json.should.deep.equal({
                $class: 'test.Person',
                email: 'john.doe@example.com',
            });
            const person2 = serializer.fromJSON(json);
            person2.email.should.equal(person.email);
        });

        it('should support versioned system imports', () => {
            modelManager = new ModelManager();
            modelManager.addCTOModel(`namespace test@1.0.0
import {Event} from concerto@1.0.0`, 'test.cto');
        });
    });

    describe('#namespace versioning - versionedNamespacesStrict:true', () => {
        it('should support versioned namespaces', () => {
            modelManager = new ModelManager({ versionedNamespacesStrict: true });
            modelManager.addCTOModel(personCto, 'person.cto');
            modelManager.addCTOModel(employeeCto, 'employee.cto');
            modelManager.getModelFile('person@1.0.0').should.be.not.null;
            modelManager.getModelFile('employee@2.0.0').should.be.not.null;
            modelManager.getType('employee@2.0.0.Employee').should.be.not.null;
        });

        it('should not support unversioned namespaces', () => {
            (() => {
                modelManager = new ModelManager({ versionedNamespacesStrict: true });
                modelManager.addCTOModel('namespace test', 'test.cto');
            }).should.throw(/Cannot add an unversioned namespace/);
        });

        it('should not support unversioned imports', () => {
            (() => {
                modelManager = new ModelManager({ versionedNamespacesStrict: true });
                modelManager.addCTOModel(`namespace test@1.0.0
import concerto.Event`, 'test.cto');
            }).should.throw(/Cannot use an unversioned import/);
        });

        it('should not deserialize unversioned declarations', () => {
            modelManager = new ModelManager({ versionedNamespacesStrict: true });
            modelManager.addCTOModel(personCto, 'person.cto');
            modelManager.addCTOModel(employeeCto, 'employee.cto');
            const factory = new Factory(modelManager);
            const serializer = new Serializer(factory, modelManager);
            (() => {
                serializer.fromJSON({
                    $class: 'test.Person',
                    email: 'john.doe@example.com',
                });
            }).should.throw(/Namespace is not defined/);
        });
    });

});
