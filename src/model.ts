import { Criteria } from "./interfaces";
import { ModelHelpers } from "./model-helpers";
import { NetHelpers } from "./net-helpers";
import { FetchConfig } from "./fetch-config";


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
    net: NetHelpers;
    static net:NetHelpers;

    constructor(record?) {
        this._insertProperties(record);
    }

    static configure(next:(fetchConfig:FetchConfig)=>void){
        let net = new NetHelpers();
        const fetchConfig = new FetchConfig(net.getHttpClient());
        next(fetchConfig);
        fetchConfig.configure();
        this.net = net;
        this.prototype.net = net;
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

        let records = await this.net.get(url);

        return ModelHelpers.constructMany(this, records, {proxy: true}, criteria);
    }


    async save(): Promise<any> {
        
        if(this._isProxy && this.id && !this.__changed){
            return Promise.resolve(this);
        }

        var record = await this.net.put(this._modelName, this.toObject());

        this.id = record.id;

        return ModelHelpers.construct(this.constructor, record);

    }

    static create(record){
        return this.net.put(this._modelName, record);
    }


    destroy() {
        return this.net.delete(`${this._modelName}/${this.id}`);
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
            return this.net.delete(`${this._modelName}/delete-many`, ids);
        }
        else{
            console.error('Array no recibido o vacio - Delete Many');
            return Promise.resolve([]);
        }

    }

    protected postAssociation(associatedModelName, relatedRecords) {
        const base_id = this.id;
        return this.net.post(`${this._modelName}/${base_id}/${associatedModelName}`, relatedRecords);
    }

    
    toObject(){
        return ModelHelpers.toObject(this);
    }

    static async createMany(records: any) {

        if (records && records.length) {
            records = await this.net.post(`${this._modelName}/create-many`, ModelHelpers.cleanManyRecords(records));
            return ModelHelpers.constructMany(this, records);
        }

        else {
            console.error('Array no recibido o vacio');
            return Promise.resolve([]);
        }

    }

    static async updateMany(records: any) {
        if (records && records.length) {
            records = await this.net.update(`${this._modelName}/update-many`, ModelHelpers.cleanManyRecords(records));
            return ModelHelpers.constructMany(this, records);
        }

        else {
            console.error('Array no recibido o vacio');
        }
    }


   static async find(criteria:Criteria): Promise<any[]> {
        
        var url = this._modelName;

        url = ModelHelpers.processCriteria(url, criteria);

        let records = await this.net.get(url);

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
        
        let records = await this.net.get(url);
        
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
        
        return this.net.post(
            this._modelName + '/' + base_id + '/' + associatedModelName + '/' + associated_id, record
        );
    }

    dissociate(associatedModelName, associated_id, record?) {
        
        const base_id = this.id;
        
        return this.net.delete(
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

        return this.net.post(`${this._modelName}/${base_id}/${associatedModelName}/associate-many`, associatedRecords);

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

        return this.net.update(`${this._modelName}/${base_id}/${associatedModelName}/associate-many-update`, associatedRecords);

    }

    dissociateMany(associatedModelName, associatedRecords) {

        const base_id = this.id;

        if (!associatedRecords || !associatedRecords.length) {
            console.error('Associated Records not exist');
            return Promise.resolve([]);
        }

        let associatedIds = ModelHelpers.getArrayOfIdsFromArrayOfObjects(associatedRecords);

        return this.net.delete(`${this._modelName}/${base_id}/${associatedModelName}/dissociate-many`, associatedIds);

    }

    static async findById(id, criteria?:Criteria, opts:any = {proxy : true}) {

        var url = this._modelName + '/' + id;
        url = ModelHelpers.processCriteria(url, criteria);

        var record = await this.net.get(url);

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