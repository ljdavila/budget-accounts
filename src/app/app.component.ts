import { Component, ViewChild} from '@angular/core';
import {MatTable, MatTableModule} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatCardModule} from '@angular/material/card';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
  FormGroup
} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import { FormBuilder } from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatInputModule} from '@angular/material/input';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {FlatTreeControl} from '@angular/cdk/tree';

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

export interface AccountNode {
  id: number;
  name: string;
  adspend: number;
  managementDataFee: number;
  dataFee: number;
  totalSpent: number;
  budgetLimit: number;
  managementFee: number;
  campaigns: any;
}

const BUDGET_DATA: AccountNode[] = [];

interface AdsetsNode {
  id: number;
  campaign?: string;
  adset?: string;
  dataFee?: number;
  percentage: number;
  adsets?: AdsetsNode[];
}

const TREE_DATA: AdsetsNode[] = [];

interface flatNode {
  expandable: boolean;
  id: number;
  campaign: string | undefined;
  percentage:  number;
  adset: string | undefined;
  dataFee: number | undefined;
  level: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet,MatCardModule, MatButtonModule, MatTableModule, MatToolbarModule, MatIconModule, MatSidenavModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent {
  title = 'budget accounts';
  showFiller = false;
  accountsDisplayedColumns: string[] = ['name','adspend', 'dataFee', 'managementDataFee', 'totalSpent', 'budgetLimit', 'action'];
  accountsDataSource = [...BUDGET_DATA];
  displayedColumns: string[] = ['campaign', 'adset', 'dataFee', 'percentage', 'action'];
  displayedViewColumns: string[] = ['campaign', 'adset', 'dataFee', 'percentage'];
  selectedCampaignData = null;
  public accountId = -1;
  public managementFee = 30;
  public budgetLimit: number = 0;

  private transformer = (node: AdsetsNode, level: number) => {
    return {
      id: node.id,
      expandable: !!node.adsets && node.adsets.length > 0,
      campaign: node.campaign,
      adset: node.adset,
      dataFee: node.dataFee,
      percentage: node.percentage,
      level: level,
    };
  }

  treeControl = new FlatTreeControl<flatNode>(
      node => node.level, node => node.expandable);

  treeFlattener = new MatTreeFlattener(
      this.transformer, node => node.level, 
      node => node.expandable, node => node.adsets);

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);



  hasChild = (_: number, node: flatNode) => node.expandable;

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.dataSource.data = TREE_DATA
  }

  accountForm = this.formBuilder.group({
    managementFeePercentage: ['', Validators.required],
    budgetLimit: ['', Validators.required],
  });

  adsetForm = this.formBuilder.group({
    adsetDataFeePercentage: ['', Validators.required],
    adsetAllocationPercentage: ['', Validators.required],
  });

  campaignForm = this.formBuilder.group({
    campaignAllocationPercentage: ['', Validators.required],
    campaignAdsetDataFeePercentage: ['', Validators.required],
    campaignAdsetAllocationPercentage: ['', Validators.required],
    adsetsArrayForm: this.formBuilder.array([])
  });


  @ViewChild(MatTable) adsetTable!: MatTable<any>;
  @ViewChild(MatTable) accountTable!: MatTable<any>;

  onSubmit(): void {
    // Process checkout data here
    const budgetLimit = Number(this.accountForm.value.budgetLimit);
    let managementDataFeePercentage: number = Number(this.accountForm.value.managementFeePercentage) ?? 30;
    const calc1 = managementDataFeePercentage / 100 + 1;

    // Calculate campaing/adsets
    let totalCampaingsFeePercentage = 0;
    console.log("here 4")
    console.log(this.dataSource.data);
    this.dataSource.data.forEach(campaign => {
      console.log("here 6")
      console.log(campaign);
      let totalPercentageAllocation = 0;
      if (campaign.adsets !== undefined) {
        let campaingBudgetAllocationPercentage: number = Number(campaign.percentage) / 100
        campaign.adsets.forEach( adset => {
          const dataFeePercentage = Number(adset.percentage) / 100;
          const adSetAllocationPercentage = Number(adset.dataFee) / 100;
          totalPercentageAllocation += campaingBudgetAllocationPercentage * dataFeePercentage * adSetAllocationPercentage;
        })
      }
      totalCampaingsFeePercentage += totalPercentageAllocation;
    })
    let calc = totalCampaingsFeePercentage + calc1;
    const adspend = budgetLimit / calc;
    const dataFeeTotal = totalCampaingsFeePercentage * adspend;
    const managementFeeTotal = (managementDataFeePercentage / 100) * adspend;
    const totalBudgetSpent = adspend + dataFeeTotal + managementFeeTotal;
    console.log("here3")
    console.log(this.dataSource);
    this.addAccount(adspend, dataFeeTotal, managementFeeTotal, totalBudgetSpent, budgetLimit, managementDataFeePercentage, this.dataSource);
    this.dataSource.data = [];
    this.accountForm.reset();
  }

  onSubmitCampaign() {
    console.log(this.campaignForm);
    let newId;

    const oldData = [...this.dataSource.data];
    if (this.dataSource.data.length === undefined) {
      newId = 1;
    } else {
      newId = this.dataSource.data.length + 1
    }
    let newData: AdsetsNode = {
      id: newId,
      campaign: "campaign " + newId.toString(),
      percentage: Number(this.campaignForm.value.campaignAllocationPercentage),
    }
    if(this.campaignForm.value.adsetsArrayForm?.length !== undefined) {
      newData.adsets = [];
      this.campaignForm.value.adsetsArrayForm.forEach((adset: any, index) => {
        let id = index + 1
        newData.adsets?.push({'id': id, 'adset': 'Ad set ' + id, 'dataFee': adset.campaignAdsetDataFeePercentage, 'percentage': adset.campaignAdsetAllocationPercentage});
      });
    } 
    oldData.push(newData);
    this.dataSource.data = oldData
    console.log("here5");
    console.log(this.dataSource)
    this.adsetTable.renderRows();
    this.campaignForm.reset();
    console.log(this.dataSource)

  }

  onSubmitAdset() {
    this.addAdset(this.adsetForm, this.selectedCampaignData);
    this.adsetForm.reset();
  }

  selectedCampaign(data: any) {
    console.log(data);
    this.selectedCampaignData = data;
  }

  addAccount(adspend: number, dataFeeTotal: number, managementFeeTotal: number, totalBudgetSpent: number, budgetLimit: number, managementFee: number, campaigns: any ) {
    let newId;
    console.log(" here 7")
    console.log(campaigns.data);
    if (this.accountsDataSource.length === undefined) {
      newId = 1;
    } else {
      newId = this.accountsDataSource.length + 1
    }
    let newData: AccountNode = {
      id: newId,
      name: 'Account' + newId,
      adspend: adspend,
      managementDataFee: managementFeeTotal,
      dataFee: dataFeeTotal,
      totalSpent: totalBudgetSpent,
      budgetLimit: budgetLimit,
      managementFee: managementFee,
      campaigns: campaigns.data,
    }
    let oldData = [...this.accountsDataSource];
    oldData.push(newData);
    this.accountsDataSource = oldData;
    this.accountTable.renderRows();
  }

  addCampaign() {
    const newId = this.dataSource.data.length + 2;
    let newData: AdsetsNode = {
      campaign: "campaign " + newId.toString(),
      percentage: 30,
      id: newId
    }
    let oldData = [...this.dataSource.data];
    oldData.push(newData);
    this.dataSource.data = oldData
    this.adsetTable.renderRows();
  }

  addAdset(form: any, data: any) {
    const currentData = [...this.dataSource.data];
    if(currentData[data.id - 1].adsets !== undefined) {
      let newId = (currentData[data.id - 1].adsets?.length ?? 0) + 1;
      console.log(newId)
      currentData[data.id - 1].adsets?.push({id: newId + 1 , adset: "Ad set " + newId , dataFee: form.value.adsetDataFeePercentage, percentage: form.value.adsetAllocationPercentage})
      this.dataSource.data = currentData;
    } else {
      currentData[data.id - 1].adsets = []
      currentData[data.id - 1].adsets?.push({id: 1, adset: "Ad set 1" , dataFee: form.value.adsetDataFeePercentage, percentage: form.value.adsetAllocationPercentage})
      this.dataSource.data = currentData;
    }
    this.adsetTable.renderRows();
  }

  get adsetsArrayForm() {
    return this.campaignForm.controls["adsetsArrayForm"] as FormArray;
  }

  addCampaignAdset() {
    const campaignAdsetForm = this.formBuilder.group({
      campaignAdsetDataFeePercentage: ['', Validators.required],
      campaignAdsetAllocationPercentage: ['', Validators.required],
    });
    this.adsetsArrayForm.push(campaignAdsetForm);
  }

  deleteCampaignAdset(adsetIndex: number) {
    this.adsetsArrayForm.removeAt(adsetIndex);
  }

  removeAccountRows(data: any) {
    let index = this.accountsDataSource.findIndex(element => element.id === data.id );
    this.accountsDataSource = [...this.accountsDataSource.slice(0, index), ...this.accountsDataSource.slice(index + 1)];
    this.accountTable.renderRows();
  }

  viewAccount(data: any) {
    let index = this.accountsDataSource.findIndex(element => element.id === data.id );
    console.log(this.accountsDataSource[index].campaigns)
    this.budgetLimit = this.accountsDataSource[index].budgetLimit;
    this.managementFee = this.accountsDataSource[index].managementFee;
    this.dataSource.data = this.accountsDataSource[index].campaigns;
    console.log(this.dataSource.data)
  }

  reset() {
    this.dataSource.data = [];
  }
  cancel(form: any){
    form.reset();
  }

  campaignFormControl = new FormControl('', [Validators.required, Validators.min(0)]);
  matcher = new MyErrorStateMatcher();
}
