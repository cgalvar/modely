import { Test } from "./models/models";

export class App {
  public message: string = 'from Aurelia!';

  activate(){
    this.hello();
  }

  hello(){
    let testito = new Test();
    console.log(Test.net);
    console.log(testito.net);
    
    debugger;
  }

  clicked() {
    // eslint-disable-next-line no-alert
    alert('A primary button click or a touch');
  }
}
