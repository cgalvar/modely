import {HttpClient, json} from 'aurelia-fetch-client';


/**
 * Un servicio para abstrater los protocolos http y websocket
 * 
 * @export
 * @class NetService
 */

export class NetService{
     private http: HttpClient;

    constructor(){
        this.http = new HttpClient();
    }

    getHttpClient(){
        return this.http;
    }


    /**
     * 
     * 
     * @param {iniciar con el nombre del recurso sin / al principio} url 
     * @param {Headers} headers 
     * @returns 
     * @memberof NetService
     */
    public async sendGETRequest(url:string, headers?){


        let response = await this.http.fetch(url);

        if(response.ok){
            try {
                return await response.json();
            } catch (error) {
                return {};
                return console.log('algo anda mal');
            }
        }

        else{

            try {
                console.error(await response.json());
            } catch (error) {
                
                console.error(await response.text());
            }

        }

    }

    public async sendGETDownloadRequest(url: string) {


        let response = await this.http.fetch(url, {headers: {responseType: 'blob'}});

        if (response.ok) {
            try {
                return await response.blob();
            } catch (error) {
                return {};
                return console.log('algo anda mal');
            }
        }

        else {

            try {
                console.error(await response.json());
            } catch (error) {

                console.error(await response.text());
            }

        }

    }

    private async sendMethodRequest(url, data, method, isFormData){

        data = isFormData ? data : json(data);

        let response = await this.http.fetch(url, {
            method: method,
            body: data
        });

        if (response.ok) {
            return await response.json();
        }

        else {
            console.error(await response.json());
        }

        
    }


    public sendPOSTRequest(url, data, isFormData){
        return this.sendMethodRequest(url, data, 'POST', isFormData);
    }

    public sendPUTRequest(url, data, isFormData){
        return this.sendMethodRequest(url, data, 'PUT', isFormData);
    }

    /**
     * sendDeleteRequest
     */
    public sendDeleteRequest(url, data?, isFormData?) {
        return this.sendMethodRequest(url, data, 'DELETE', isFormData);
    }


}