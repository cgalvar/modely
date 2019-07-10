import { FetchConfig } from "./fetchConfig";
import { NetHelpers } from "./net-helpers";


let net: NetHelpers = new NetHelpers();

const fetchConfig = new FetchConfig(net.getHttpClient());


/**
 * Funcion utilitaria para que configures el cliente http, se te pasa 
 * como paramentro a fetchConfig con el cual puedes configurar cors, baseUrl, etc
 *
 * @export
 * @param {(fetchConfig:FetchConfig)=>{}} next
 */
export function configureFetch(next:(fetchConfig:FetchConfig)=>{}) {
    next(fetchConfig);
}

export function configureToken(token) {
    fetchConfig.bearerToken(token);
    fetchConfig.configure();
}


export abstract class Model {
    
    __changed: boolean;
    id: number;
    
    protected static _modelName:string;
    protected _modelName: any;

    /**
     * Objeto, con lista clave(relation method), valor(Model)
     * 
     * @protected
     * @memberof Model
     */
    relations:any;
    _isProxy: number;

    constructor(record?) {
        this._insertProperties(record);
    }

    static setModelName(modelName){
        this._modelName = modelName;
        this.prototype._modelName = modelName;
    }

    private _insertProperties(record) {
        for (const key in record) {
            if (record.hasOwnProperty(key)) {
                const element = record[key];
                this[key] = element;
            }
        }
    }

    static async getAll(criteria:Criteria = {}) {

        var url = this._modelName;

        url = ModelHelpers.processCriteria(url, criteria);

        let records = await net.get(url);

        return ModelHelpers.constructMany(this, records, {proxy: true}, criteria);
    }


    async save(): Promise<any> {
        
        if(this._isProxy && this.id && !this.__changed){
            return Promise.resolve(this);
        }

        var record = await net.put(this._modelName, this.toObject());

        this.id = record.id;

        return ModelHelpers.construct(this.constructor, record);

    }

    static create(record){
        return net.put(this._modelName, record);
    }


    destroy() {
        return net.delete(`${this._modelName}/${this.id}`);
    }

    /**
     * 
     * 
     * @param {any} ids Array de ids 
     * @memberof Service
     */
    static deleteMany(records) {

        const ids = ModelHelpers.getArrayOfIdsFromArrayOfObjects(records)

        if(ids && ids.length){
            return net.delete(`${this._modelName}/delete-many`, ids);
        }
        else{
            console.error('Array no recibido o vacio - Delete Many');
            return Promise.resolve([]);
        }

    }

    protected postAssociation(associatedModelName, relatedRecords) {
        const base_id = this.id;
        return net.post(`${this._modelName}/${base_id}/${associatedModelName}`, relatedRecords);
    }

    
    toObject(){
        return ModelHelpers.toObject(this);
    }

    static async createMany(records: any) {

        if (records && records.length) {
            records = await net.post(`${this._modelName}/create-many`, ModelHelpers.cleanManyRecords(records));
            return ModelHelpers.constructMany(this, records);
        }

        else {
            console.error('Array no recibido o vacio');
            return Promise.resolve([]);
        }

    }

    static async updateMany(records: any) {
        if (records && records.length) {
            records = await net.update(`${this._modelName}/update-many`, ModelHelpers.cleanManyRecords(records));
            return ModelHelpers.constructMany(this, records);
        }

        else {
            console.error('Array no recibido o vacio');
        }
    }


   static async find(criteria:Criteria): Promise<any[]> {
        
        var url = this._modelName;

        url = ModelHelpers.processCriteria(url, criteria);

        let records = await net.get(url);

        return ModelHelpers.constructMany(this, records, {proxy: true}, criteria);

    }

    async populateWhere(associatedModelName: string, criteria?:Criteria, base_id?:Number) {
        base_id = base_id || this.id;
        
        if(!base_id){
            console.trace('Esta instancia no ha sido guardada, checar');
            return;
        }

        var url = this._modelName + '/' + base_id + '/' + associatedModelName;
        
        url = ModelHelpers.processCriteria(url, criteria);
        
        let records = await net.get(url);
        
        // relacion many to Many
        if(records && records.length){

            for (let i = 0; i < records.length; i++) {
                const element = records[i];
                
                if(element.pivot){
    
                    for (const key in element.pivot) {
                        if (element.pivot.hasOwnProperty(key)) {
                            const pivot = element.pivot[key];
                            if(key.includes('_id'))
                                continue;
                            else
                                element[key] = pivot;
                        }
                    }
    
                }
    
            }
    
            if (this.relations && this.relations[associatedModelName]){
                return ModelHelpers.constructMany(this.relations[associatedModelName], records, {proxy: true}, criteria);
            }
        }
        
        else if(!ModelHelpers._isEmptyObject(records)){
            if (this.relations && this.relations[associatedModelName]) {
                return ModelHelpers.construct(this.relations[associatedModelName], records, { proxy: true }, criteria);
            }
        }


        

        return records;


    }

    static populateWhere(base_id, associatedModelName: string, criteria?: Criteria){
        return this.prototype.populateWhere(associatedModelName, criteria, base_id);
    }


    /**
     * Equivalente a addTo de Sailsjs
     * 
     * @memberof Service
     */
    associate(associatedModelName:string, associated_id:number, record?) {
        
        const base_id = this.id;
        
        return net.post(
            this._modelName + '/' + base_id + '/' + associatedModelName + '/' + associated_id, record
        );
    }

    dissociate(associatedModelName, associated_id, record?) {
        
        const base_id = this.id;
        
        return net.delete(
            this._modelName + '/' + base_id + '/' + associatedModelName + '/' + associated_id, record
        );
    }


    /**
     * 
     * @param {any} associatedModelName 
     * @param {any} associatedRecords
     * @returns 
     * @memberof Service
     */
    associateMany(associatedModelName, associatedRecords, extraFieldsName?:string[], associatedIdName?:string) {

        const base_id = this.id;

        if (!associatedRecords || !associatedRecords.length) {
            console.error('Associated Records not exist');
            return Promise.resolve([]);
        }
        if (!extraFieldsName || !extraFieldsName.length) {
            associatedRecords = ModelHelpers.getArrayOfIdsFromArrayOfObjects(associatedRecords);
        }
        else{
            associatedRecords = ModelHelpers.getPivotObjectsFromArrayOfObjects(associatedRecords, extraFieldsName, associatedIdName);
        }

        return net.post(`${this._modelName}/${base_id}/${associatedModelName}/associate-many`, associatedRecords);

    }

    updateManyAssociation(associatedModelName, associatedRecords, extraFieldsName?: string[], associatedIdName?: string){

        const base_id = this.id;

        if (!associatedRecords || !associatedRecords.length) {
            console.error('Associated Records not exist');
            return Promise.resolve([]);
        }
        if (!extraFieldsName || !extraFieldsName.length) {
            associatedRecords = ModelHelpers.getArrayOfIdsFromArrayOfObjects(associatedRecords);
        }
        else {
            associatedRecords = ModelHelpers.getPivotObjectsFromArrayOfObjects(associatedRecords, extraFieldsName, associatedIdName);
        }

        return net.update(`${this._modelName}/${base_id}/${associatedModelName}/associate-many-update`, associatedRecords);

    }

    dissociateMany(associatedModelName, associatedRecords) {

        const base_id = this.id;

        if (!associatedRecords || !associatedRecords.length) {
            console.error('Associated Records not exist');
            return Promise.resolve([]);
        }

        let associatedIds = ModelHelpers.getArrayOfIdsFromArrayOfObjects(associatedRecords);

        return net.delete(`${this._modelName}/${base_id}/${associatedModelName}/dissociate-many`, associatedIds);

    }

    static async findById(id, criteria?:Criteria, opts:any = {proxy : true}) {

        var url = this._modelName + '/' + id;
        url = ModelHelpers.processCriteria(url, criteria);

        var record = await net.get(url);

        if(opts.proxy){
            return ModelHelpers.construct(this, record, opts.proxy, criteria);
        }

        else{
            return record;
        }

    }

    static async findOne(criteria:Criteria): Promise<any> {
        
        var records = await this.find(criteria);

        if(records.length){
            return ModelHelpers.construct(this, records[0], true, criteria);
        }

        else{
            return null;
        }


    }

    static constructMany(records, opts = {}, criteria:Criteria){
        return ModelHelpers.constructMany(this, records, opts, criteria)
    }

}

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
        let formData = new FormData();

        formData.append('file', file, fileName);
        
        for (const key in opts) {
            if (opts.hasOwnProperty(key)) {
                const element = opts[key];
                formData.append(key, element);
            }
        }

        return net.post(url, formData, true)

    }

}

export type Populate = (string | populateObject)[];

interface basicCriteria{
    andWhere?: any;
    whereHas?: WhereHas[];
    orWhere?: any;
    whereNot?:any;
    where?: any;
    orWhereNot?:any;
    whereGreaterThan?:any;
    whereLessThan?:any;
    count?: any;
    whereBetween?: any;
}

export interface Criteria extends basicCriteria{
    populate?: Populate;
    wherePivot?: any;
    fields?:any;
    has?: (string | Has)[];
    sort?: orderBy;
    orderBy?: orderBy;
    limit?: number;
}


interface orderBy{
    column?:string;
    dir?: string
}

export interface WhereHas extends basicCriteria{
    resource: string;
    greaterThan: number;
    lessThan: number;
}


export interface populateObject extends Criteria{
    resource: string;
}

export interface Has{
    resource: string;
    whereHas?: WhereHas[];
    greaterThan: number;
    lessThan: number;
    has?: (string | Has)[];
}


export { NetHelpers } from "./net-helpers";