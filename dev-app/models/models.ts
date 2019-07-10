import { Model, FetchConfig } from "resources";

class ModelPrincipal extends Model{
    constructor(record?) {
        super(record)
    }
}

ModelPrincipal.configure((fetchConfig:FetchConfig)=>{
    fetchConfig.setBaseUrl('http://localhost:3000')
    .acceptJSON()
    .cors()
})


export class Test extends ModelPrincipal{
    constructor(record?) {
        super(record);
    }
}