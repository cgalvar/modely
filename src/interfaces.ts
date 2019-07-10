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