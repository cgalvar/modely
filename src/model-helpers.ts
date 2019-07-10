import { Criteria, Populate } from "./interfaces";
import { Model } from "./model";

export class ModelHelpers {
    

    static toObject(model){
        var plainObject: any = {};

        for (const key in model) {
            if (model.hasOwnProperty(key)) {

                const element = model[key];

                if(typeof element != 'function'){
                    plainObject[key] = element;
                }

            }
        }

        this.cleanRecord(plainObject);

        return plainObject;

     }

    static _isEmptyObject(obj) {
        // Speed up calls to hasOwnProperty
        var hasOwnProperty = Object.prototype.hasOwnProperty;

        // null and undefined are "empty"
        if (obj == null) return true;

        // Assume if it has a length property with a non-zero value
        // that that property is correct.
        if (obj.length > 0) return false;
        if (obj.length === 0) return true;

        // If it isn't an object at this point
        // it is empty, but it can't be anything *but* empty
        // Is it empty?  Depends on your application.
        if (typeof obj !== "object") return true;

        if (Object.getOwnPropertyNames(obj).length > 0) return false;

        return true;
    }

    static processCriteria(url, criteria:Criteria){
        
        if(criteria){

            let i = 0;

            for (const key in criteria) {
                if (criteria.hasOwnProperty(key)) {
                    const element = criteria[key];
                    
                    if(element)
                        url = url + (i == 0? '?': '&') + `${key}=` + JSON.stringify(element);
                    i++;
                }
            }
        }

        return url;

    }

    static isPlainObject(obj) {
        return typeof obj === 'object'
            && obj !== null
            && obj.constructor === Object
            && Object.prototype.toString.call(obj) === '[object Object]';
    }

    static cloneObject(obj){
    
        let newObj = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const element = obj[key];
                newObj[key] = element;
            }
        }
    
        return newObj;
    
    }

    static proxyHandlerObject = {
        set: function (target, name: string, value) {

            target[name] = value;
            if (name.startsWith('__')) {
                return true;
            }

            this.checkChanges(target);

            return true;
        },

        checkChanges(target) {

            target.__changed = false;

            for (const key in target) {
                if (target.hasOwnProperty(key)) {
                    const element = target[key];

                    if (key.startsWith('__')) {
                        continue;
                    }

                    if (element != target.__original[key]) {
                        debugger;
                        console.log(`Cambio por que ${element} != ${target.__original[key]}`);

                        target.__changed = true;
                    }

                }
            }

        }
    }

    static proxyHandlerArray = {

        set: function (target, name, value) {
            target._toAdd.push(value);
            target[name] = value;
            return true;
        },

        deleteProperty(target, name){
            if(target[name].id){
                target._toDelete.push(target[name].id);
            }

            delete target[name];

            return true;

        }

    }

    static construct(model, record, proxy?, criteria?:Criteria) {
        if(criteria && model.prototype.relations){
            this.constructRelations(model, record, criteria);
        }
        if(proxy){
            record._isProxy = true;

            record.__original = this.cloneObject(record);

            return new Proxy(new model(record), ModelHelpers.proxyHandlerObject);
        }

        else{
            return new model(record);
        }
        
    }

    static constructMany(model, records, opts:any = {}, criteria?:Criteria) {
        
        if (!records) {
            console.error('no hay records');
            return [];
        }

        var {proxy, arrayProxy} = opts;

        var proxyRecords = [];
        
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            proxyRecords.push(this.construct(model, record, proxy, criteria))
        }

        if(arrayProxy){
            return new Proxy(proxyRecords, this.proxyHandlerArray);
        }

        else{
            return proxyRecords;
        }


    }

    static constructRelations(model, record, criteria:Criteria){
 
        if(criteria.populate){

            this.constructPopulate(model, record, criteria.populate);

        }

    }

    static constructPopulate(model: typeof Model, record, populate: Populate){

        if(!model || !record || !model.prototype.relations){
            return console.log('record or model or relations undefined');
        }

        // ["productos", {resource: productos, populate: []}]
        for (let i = 0; i < populate.length; i++) {
            const populateElement = populate[i];

            if (typeof populateElement == "string") {
                this.constructRelation(record, model, populateElement)
            }

            else {
                this.constructRelation(record, model, populateElement.resource);

                // si es deep populate
                if (populateElement.populate) {
                    this.constructPopulate(model.prototype.relations[populateElement.resource], record[populateElement.resource], populateElement.populate)
                }

            }

        }
    }

    /**
     * 
     * 
     * @static
     * @param {any} record 
     * @param {any} model 
     * @param {any} populateName Nombre del metodo relacionado
     * @memberof ModelHelpers
     */
    static constructRelation(record, model: typeof Model, populateName){
        
        if(!model || !record){
            console.log('quieres construir a ' + populateName);
            console.log(record);
            console.log(' pero model es undefined');
            return;
        }
        
        if (model.prototype.relations[populateName] && record[populateName]) {

            // si la relacion es belongsToMany || hasMany
            if (Array.isArray(record[populateName]))
                record[populateName] = this.constructMany(model.prototype.relations[populateName], record[populateName], {proxy:true});
        
            else
                record[populateName] = this.construct(model.prototype.relations[populateName], record[populateName], true);

        }
    }

    static cleanManyRecords(records) {

        let plainRecords = [];

        for (let i = 0; i < records.length; i++) {
            let element = records[i];

            if(element.toObject){
                element = element.toObject();
            }

            else{
                this.cleanRecord(element);
            }

            plainRecords.push(element);
        }

        return plainRecords;

    }

    static cleanRecord(record) {
        for (const key in record) {
            if (record.hasOwnProperty(key)) {
                const element = record[key];
                if (element === undefined || element === null) {
                    delete record[key];
                }
                else if (Array.isArray(element)) {
                    delete record[key];
                }
                else if (this.isPlainObject(element)) {
                    delete record[key];
                }

                else if (element.constructor.prototype instanceof Model) {
                    delete record[key];   
                }

                else if (element instanceof Date) {
                    continue;
                }

                // si no es primitivo, si es un objeto
                else if (element === Object(element)) {
                    delete record[key];
                }

                else if(key.startsWith('_')){
                    delete record[key];
                }

            }
        }

        return record;

    }

    static getArrayOfIdsFromArrayOfObjects(records){
        let ids = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            ids.push(record.id);
        }

        return ids;

    }

    static getPivotObjectsFromArrayOfObjects(records, extraFieldsName:string[], associatedIdName){

        let pivotRecords = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            let pivotRecord = {};
            pivotRecord[associatedIdName] = record.id;

            for (let j = 0; j < extraFieldsName.length; j++) {
                const extraFieldName = extraFieldsName[j];
                pivotRecord[extraFieldName] = record[extraFieldName];
            }
            
            pivotRecords.push(pivotRecord);
        }

        return pivotRecords;

    }   

    static constructPopulatedRecords(populate:Populate, record){

        for (let i = 0; i < populate.length; i++) {
            const populateElement = populate[i];
            
            if(typeof populateElement == "string"){
                if(record[populateElement]){
                    if(Array.isArray(record[populateElement])){
                        //record[populateElement] = this.constructMany()
                    }

                }
            }

        }

    }

    static uploadFile(url, file, fileName, opts = {}){
        
        return ;

        // evaluating what todo with this
        
        let formData = new FormData();

        formData.append('file', file, fileName);
        
        for (const key in opts) {
            if (opts.hasOwnProperty(key)) {
                const element = opts[key];
                formData.append(key, element);
            }
        }

        //@ts-ignore
        return net.post(url, formData, true)

    }

}