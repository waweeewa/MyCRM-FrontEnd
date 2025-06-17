<template>
  <Dialog v-model:visible="internalVisible" :modal="true" :style="{ width: '1200px' }" :header="'Electricity Summary'" :closable="true" :closeOnEscape="true" @hide="closeModal">
    <div v-if="isAdmin" style="margin-bottom: 10px;">
      <Dropdown :options="users" optionLabel="label" optionValue="value" v-model="selectedUser" placeholder="Select a User" @change="fetchSummary" />
    </div>
    <div class="stats-boxes-container summary-items">
      <div class="stats-box" v-for="(item, index) in summaryItems" :key="index">
        <h3>{{ item.title }}</h3>
        <p>{{ item.value }}</p>
      </div>
    </div>

    <div class="content-layout">
      <!-- Left column with chart -->
      <div class="chart-column">
        <div v-if="additionalStats.modMonthName" class="mod-month-banner">
          <i class="pi pi-calendar-plus"></i>
          <span>Current Mod Month: <strong>{{ additionalStats.modMonthName }}</strong></span>
        </div>
        
        <div class="graph-container">
          <Apexchart type="bar" height="350" :options="chartOptions" :series="chartSeries" />
        </div>
        
        <div class="stats-row">
          <div class="stats-box">
            <h3>Winter Average</h3>
            <p>{{ additionalStats.winterAverage }}</p>
          </div>
          <div class="stats-box">
            <h3>Summer Average</h3>
            <p>{{ additionalStats.summerAverage }}</p>
          </div>
          <div class="stats-box">
            <h3>Last year's median</h3>
            <p>{{ additionalStats.medianLastYearConsumption }}</p>
          </div>
        </div>
      </div>
      
      <!-- Right column with predictions -->
      <div class="predictions-column">
        <div v-if="nextYearPrediction && nextYearPrediction.length > 0" class="next-year-prediction">
          <h3><i class="pi pi-calendar"></i> Next Year Consumption Prediction</h3>
          <div class="prediction-grid">
            <div v-for="(value, index) in nextYearPrediction" :key="index" class="prediction-item">
              <span class="month">{{ chartOptions.xaxis.categories[index] }}</span>
              <span class="value">{{ Math.round(value) }} kW/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script>
import { ref, watch, onMounted, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Apexchart from 'vue3-apexcharts';
import Dropdown from 'primevue/dropdown';
import { GetElectricitySummary, GetPartners } from '../services/services.js';

export default {
  name: "ElectricitySummaryModal",
  components: {
    Dialog,
    Button,
    Apexchart,
    Dropdown
  },
  props: {
    userId: { type: [String, Number], required: true },
    visible: { type: Boolean, required: true }
  },
  emits: ['update:visible'],
  setup(props, { emit }) {
    const internalVisible = computed({
      get: () => props.visible,
      set: (value) => emit('update:visible', value)
    });

    const isAdmin = localStorage.getItem('isAdmin') === '1';
    const users = ref([]);
    const selectedUser = ref(null);

    const summaryItems = ref([]);
    const chartSeries = ref([]);
    const trendPredictions = ref([]);
    const nextYearPrediction = ref([]);
    const additionalStats = ref({});


    const chartOptions = ref({
      chart: { 
        background: '#181818', 
        foreColor: '#E0E0E0',
        animations: {
          enabled: true
        },
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          dataLabels: {
            position: 'bottom'
          }
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'middle',
        formatter: function(val) {
          return val ? Math.round(val) + ' kW/h' : '';
        },
        offsetY: 15,
        style: {
          fontSize: '11px',
          colors: ['#ffffff']
        },
        background: {
          enabled: false
        }
      },
      xaxis: { 
        categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      },
      yaxis: {
        title: {
          text: 'kW/h',
          style: { fontSize: '20px', color: '#E0E0E0' }
        }
      },
      colors: ['#3498db'],
      title: { text: 'Monthly Consumption', style: { fontSize: '20px', color: '#FFFFFF' } },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: function(val) {
            return val + ' kW/h';
          }
        }
      }
    });

    const fetchUsers = async () => {
      try {
        const response = await GetPartners();
        if(response && response.data && response.data.result){
          // Map partners to an array of objects with label and value
          users.value = response.data.result.map(u => ({
            label: u.userEmail,
            value: u.userId
          }));
          selectedUser.value = users.value[0]?.value;
        }
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      }
    };

    const fetchSummary = async () => {
      let uid = props.userId;
      if (isAdmin) {
        uid = selectedUser.value;
      }
      if (!uid) return;
      try {
        const response = await GetElectricitySummary(uid);
        const data = response.data;
        
        // Process basic summary items
        summaryItems.value = [
          { title: 'Last Month Consumption', value: data.lastMonthConsumption  + ' kW/h' },
          { title: 'Current Year Consumption', value: data.currentYearConsumption + ' kW/h' },
          { title: 'Last Year Consumption', value: data.lastYearConsumption  + ' kW/h' },
          { title: 'Last Month Price', value: data.lastMonthPrice + '€' },
          { title: 'Current Year Price', value: data.currentYearPrice + '€' },
          { title: 'Last Year Price', value: data.lastYearPrice + '€' },
        ];
        
        // Set consumption data for the chart
        chartSeries.value = [{ name: 'Consumption', data: data.monthlyConsumption }];
        
        // Set trend prediction data
        trendPredictions.value = data.trendPrediction || [];
        
        // Use trendPrediction data for nextYearPrediction if nextYearPrediction isn't provided
        nextYearPrediction.value = data.nextYearPrediction || data.trendPrediction || [];
        
        // Additional statistics for boxes
        additionalStats.value = {
          winterAverage: data.winterAverage ? Math.round(data.winterAverage) + ' kW/h' : 'N/A',
          summerAverage: data.summerAverage ? Math.round(data.summerAverage) + ' kW/h' : 'N/A',
          medianLastYearConsumption: data.medianLastYearConsumption ? data.medianLastYearConsumption + ' kW/h' : 'N/A',
          modMonthName: data.modMonthName || 'N/A'
        };
        
      } catch (error) {
        console.error('Failed to fetch summary data:', error);
      }
    };

    const closeModal = () => { internalVisible.value = false; };

    watch(() => props.visible, (val) => { if(val) fetchSummary(); });
    if (isAdmin) {
      watch(selectedUser, () => {
        fetchSummary();
      });
      onMounted(() => { fetchUsers(); });
    }
    onMounted(() => { if(props.visible) fetchSummary(); });

    return { 
      internalVisible, 
      summaryItems, 
      chartSeries, 
      chartOptions, 
      trendPredictions,
      nextYearPrediction,
      additionalStats,
      closeModal, 
      isAdmin, 
      users, 
      selectedUser, 
      fetchSummary 
    };
  }
};
</script>

<style scoped>
.summary-container { display: flex; flex-wrap: wrap; justify-content: space-around; margin-bottom: 20px; }
.summary-box { background: #242424; color: #E0E0E0; padding: 10px; margin: 5px; border-radius: 10px; flex: 1 1 30%; text-align: center; }
.modalActions { display: flex; justify-content: flex-end; margin-top: 20px; }

.graph-container {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #444;
  background-color: #181818;
  height: 100%;
}

.stats-boxes-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  margin-top: 0;
  gap: 15px;
}

.stats-boxes-container.summary-items {
  grid-template-columns: repeat(6, 1fr);
  display: grid;
  gap: 15px;
}

.stats-box {
  background: #242424;
  color: #E0E0E0;
  padding: 15px;
  border-radius: 10px;
  flex: 1 1 20%;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.stats-box:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.stats-box h3 {
  margin-top: 0;
  font-size: 14px;
  color: #bbbbbb;
  margin-bottom: 8px;
}

.stats-box p {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #2ecc71;
}

.next-year-prediction {
  height: 100%;
  background: #242424;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.next-year-prediction h3 {
  color: #bbbbbb;
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 15px;
}

.prediction-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  overflow-y: auto;
  flex-grow: 1;
}

.prediction-item {
  background: #181818;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.prediction-item .month {
  font-size: 14px;
  color: #bbbbbb;
}

.prediction-item .value {
  font-size: 16px;
  font-weight: bold;
  color: #2ecc71;
  margin-top: 5px;
}

.content-layout {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.chart-column {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.predictions-column {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.stats-row {
  display: flex;
  gap: 15px;
}

.stats-row .stats-box {
  flex: 1;
}

.mod-month-banner {
  background: #2c3e50;
  color: white;
  padding: 12px 15px;
  border-radius: 10px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.mod-month-banner i {
  color: #3498db;
  margin-right: 10px;
  font-size: 20px;
}

.mod-month-banner strong {
  color: #2ecc71;
  margin-left: 5px;
  font-size: 20px;
}
</style>
