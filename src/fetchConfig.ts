import { HttpClient } from "aurelia-fetch-client";


export class FetchConfig {
    private url: any;
    private headers = {};
    private defaults:any = {};
    
    constructor(private http:HttpClient) {}

    setBaseUrl(url){
        this.url = url;
        return this;
    }

    addHeader(field, value){
        this.headers[field] = value;
        return this;
    }

    addDefault(field, value){
        this.defaults[field] = value;
        return this;
    }

    removeDefault(field){
        delete this.defaults[field];
    }

    removeHeader(field){
        delete this.headers[field];
    }
    
    acceptJSON(){
        return this.addHeader('Accept', 'application/json');
    }

    includeCredentials(){
        return this.addDefault('credentials', 'include');
    }

    cors(){
       return this.addDefault('mode', 'cors');
    }

    bearerToken(token){
        return this.addHeader('Authorization', `Bearer ${token}`);
    }

    configure(){

        this.defaults.headers = this.headers;

        this.http.configure(config => {
            config
                .withBaseUrl(this.url)
                .withDefaults(this.defaults);       
        });
        
    }

}