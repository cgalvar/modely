import { NetService } from "./net-service";

export class NetHelpers{

    netService: NetService;
    private _apiPrefix: boolean = true;
    private _prefixUrl: any;
    constructor(){
        this.netService = new NetService();
    }

    getHttpClient(){
        return this.netService.getHttpClient();
    }



    put(url: string, record, isFormData?){

        if(record.id){

            url += '/' + record.id;

            return this.netService.sendPUTRequest(url, record, isFormData);
        }

        else{
            return this.netService.sendPOSTRequest(url, record, isFormData);
        }

    }

    update(url, data, isFormData?){


        return this.netService.sendPUTRequest(url, data, isFormData);
    }

    post(url: string, record?, isFormData?){
        return this.netService.sendPOSTRequest(url, record, isFormData);
    }


    get(url):Promise<any | any[]>{
        return this.netService.sendGETRequest(url);
    }

    delete(url, data?){
        return this.netService.sendDeleteRequest(url, data);
    }

    async download(url, name){
        let data = await this.netService.sendGETDownloadRequest(url);

        var a = document.createElement('a');
        var resource = window.URL.createObjectURL(data);
        a.href = resource;
        a.download = name;
        a.click();
        window.URL.revokeObjectURL(url);

    }



}