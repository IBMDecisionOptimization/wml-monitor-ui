
let IAM_URL = "https://iam.cloud.ibm.com/identity/token";
let IAM_TIMEOUT = 3600;
let deployment_id = null;
let job_id = null;
let bearerToken = null;
let bearerTokenTime = 0;

function load() {        
        getDeployments();
}

function emptyJobDetails() {
        let div = document.getElementById("job_div");
        div.innerHTML = "";
}

function deleteJob(jobId) {
        axios({
                method:'delete',
                url:'/api/jobs/'+jobId,
                responseType:'json',
              })
        .then(function (response) {
                getJobs(deployment_id); 
        });
}
function rerunJob(jobId) {
        
        axios({
                method:'get',
                url:'/api/jobs/'+jobId,
                responseType:'json',
              })
        .then(function (response) {
                let job_id = ("guid" in response.data.metadata) ? response.data.metadata.guid : response.data.metadata.id; 
                axios({
                        method:'post',
                        url:'/api/jobs',
                        responseType:'json',
                        data: response.data.entity
                      })
                .then(function (response) {

                        getJobs(deployment_id);
                });
        });
}
function selectJob(jobId) {
        job_id = jobId;
        showJobs();
        
        let div = document.getElementById("job_div");
        div.innerHTML = "... UPDATING JOB DETAILS ...";
        axios({
                method:'get',
                url:'/api/jobs/'+jobId,
                responseType:'json',
              })
        .then(function (response) {
                let div = document.getElementById("job_div");        
                let job_id = ("guid" in response.data.metadata) ? response.data.metadata.guid : response.data.metadata.id;        
                let html = '<b>Job: ' + job_id + '</b><div id="REFRESH_JOB" style="cursor:pointer">REFRESH</div><br>'
                html +=  '<b>Created at:</b> ' + response.data.metadata.created_at + '<br>';
                html +=  '<b>Completed at:</b> ' + response.data.entity.decision_optimization.status.completed_at + '<br>';
                for (r in response.data.entity.decision_optimization.input_data)
                        html += '<b>Input (inline):</b> <a target="_blank" href="/api/jobs/'+job_id+'/'+response.data.entity.decision_optimization.input_data[r].id+'">' + response.data.entity.decision_optimization.input_data[r].id + '</a><br>';
                for (r in response.data.entity.decision_optimization.input_data_references)
                        html += '<b>Input (reference):</b> <a target="_blank" href="/api/jobs/'+job_id+'/'+response.data.entity.decision_optimization.input_data_references[r].id+'">' + response.data.entity.decision_optimization.input_data_references[r].id + '</a><br>';
                for (r in response.data.entity.decision_optimization.output_data)
                        html += '<b>Output (inline):</b> <a target="_blank" href="/api/jobs/'+job_id+'/'+response.data.entity.decision_optimization.output_data[r].id+'">' + response.data.entity.decision_optimization.output_data[r].id + '</a><br>';
                for (r in response.data.entity.decision_optimization.output_data_references)
                        html += '<b>Output (reference):</b> <a target="_blank" href="/api/jobs/'+job_id+'/'+response.data.entity.decision_optimization.output_data_references[r].id+'">' + response.data.entity.decision_optimization.output_data_references[r].id + '</a><br>';
                html +=  '<b>State:</b> ' + response.data.entity.decision_optimization.status.state + '<br>';
                if ('solve_state' in response.data.entity.decision_optimization) {
                        html +=  '<b>Solve State:</b> ' + response.data.entity.decision_optimization.solve_state.solve_status + '<br>';
                        html +=  '<b>Last log:</b> <br>';
                        html += '<pre>';
                        for (r in response.data.entity.decision_optimization.solve_state.latest_engine_activity)
                                html +=response.data.entity.decision_optimization.solve_state.latest_engine_activity[r] + "\n";
                        html += '</pre>';
                }
               div.innerHTML = html;  
               document.getElementById('REFRESH_JOB').onclick = function() {
                        selectJob(job_id);
                }   
        });
    }

jobs = null;
function showJobs() {

        resources = jobs;
        let div = document.getElementById("jobs_div");
        if (resources==null) {
                div.innerHTML = "";
                return;
        }

        let html = '<b>Jobs ('+ resources.length +')</b><div id="REFRESH_JOBS" style="cursor:pointer">REFRESH</div><br>'
        html += '<table class="table table-hover table-sm">'
        html += '<thead><tr><th>id</th><th>state</th><th>created</th><th>running</th><th>completed</th><th></th><th></th><th></th></tr></thead>'
        html += '<tbody>'

        for (let r in resources) {
                html += '<tr>'
                let res = resources[r][1];
                let res_id = ("guid" in res.metadata) ? res.metadata.guid : res.metadata.id;
                let isBold = (job_id == res_id)
                let sbold = isBold ? '<b>' : '';
                let ebold = isBold ? '</b>' : '';
                html += '<td>' + sbold + res_id + ebold + '</td>';
                html += '<td>' + sbold + res.entity.decision_optimization.status.state + ebold + '</td>';
                html += '<td>' + sbold + res.metadata.created_at + ebold + '</td>';
                if ('status' in res.entity.decision_optimization) {
                        html += '<td>' + sbold + res.entity.decision_optimization.status.running_at + ebold + '</td>';
                        html += '<td>' + sbold + res.entity.decision_optimization.status.completed_at + ebold + '</td>';        
                } else {
                        html += '<td></td>';
                        html += '<td></td>';
                }

                if (isBold) {
                        html += '<td></td>';
                } else {
                        html += '<td>' + sbold + '<div id="JOB_SELECT_'+res_id+'" style="cursor:pointer">SELECT</div>'+ ebold +'</td>';
                }
                html += '<td>' + sbold + '<div id="JOB_RERUN_'+res_id+'" style="cursor:pointer">RERUN</div>'+ ebold +'</td>';
                html += '<td>' + sbold + '<div id="JOB_DELETE_'+res_id+'" style="cursor:pointer">DELETE</div>'+ ebold + '</td>';
                html += '</tr/>';                       
        }
        html += '</tbody>';
        html += '</table>';
        if (resources.length> 0) 
                html += '<div id="jobs_timeline" style="height: 480px;"></div>'
        div.innerHTML = html;
        for (let r in resources) {
                let res = resources[r][1];
                let res_id = ("guid" in res.metadata) ? res.metadata.guid : res.metadata.id;
                document.getElementById('JOB_DELETE_'+res_id).onclick = function() {
                        deleteJob(res_id);
                }
                document.getElementById('JOB_RERUN_'+res_id).onclick = function() {
                        rerunJob(res_id);
                }
                let isBold = (job_id == res_id)
                if (!isBold)
                        document.getElementById('JOB_SELECT_'+res_id).onclick = function() {
                        selectJob(res_id);
                }
        }
        document.getElementById('REFRESH_JOBS').onclick = function() {
                getJobs(deployment_id);
        }

        if (resources.length> 0) {
                var container = document.getElementById('jobs_timeline');
                var chart = new google.visualization.Timeline(container);
                var dataTable = new google.visualization.DataTable();

                dataTable.addColumn({ type: 'string', id: 'id' });
                dataTable.addColumn({ type: 'date', id: 'Start' });
                dataTable.addColumn({ type: 'date', id: 'End' });

                for (let r in resources) {
                        let res = resources[r][1];
                        let res_id = ("guid" in res.metadata) ? res.metadata.guid : res.metadata.id;
                        dataTable.addRow([  res_id, 
                                new Date(res.entity.decision_optimization.status.running_at), 
                                new Date(res.entity.decision_optimization.status.completed_at) ])
                }
                dataTable.sort([{column: 1}]);
                var options = {
                  title: 'Jobs timeline',          
                  hAxis: {
                    format: 'M/d/yy',
                    gridlines: {count: 15}
                  }        
                 };

                chart.draw(dataTable, options);
        }
}

function emptyJobs() {
        jobs = null;
        showJobs();
}

function getJobs(deploymentId) {
        deployment_id = deploymentId;
        showDeployments();
        emptyJobs();
        emptyJobDetails();

        let div = document.getElementById("jobs_div");
        div.innerHTML = "... UPDATING JOBS LIST ...";
        axios({
                method:'get',
                url:'/api/jobs?deployment_id='+deploymentId,
                responseType:'json',
              })
        .then(function (response) {                               

                // Create items array
                var resources = Object.keys(response.data.resources).map(function(key) {
                        return [key, response.data.resources[key]];
                });
                
                        // Sort the array based on the second element
                resources.sort(function(first, second) {
                        return Date.parse(second[1].metadata.created_at) - Date.parse(first[1].metadata.created_at);
                });

                jobs = resources;
                showJobs();                
                        
        });
    }

function deleteDeployment(deploymentId) {

        let div = document.getElementById("jobs_div");
        div.innerHTML = "... UPDATING JOBS LIST ...";
        axios({
                method:'delete',
                url:'/api/deployments/'+deploymentId,
                responseType:'json',
              })
        .then(function (response) {                           
                getDeployments();
        });
}
deployments = null;
function showDeployments() {
        let resources = deployments;

        let div = document.getElementById("deployments_div");
                
        let html = '<b>Deployments ('+ resources.length +')</b><div id="REFRESH_DEPLOYMENTS" style="cursor:pointer">REFRESH</div><br>'
        html += '<table class="table table-hover table-sm">'
        html += '<thead><tr><th>Name</th><th>nodes</th><th>size</th><th>state</th><th>created at</th><th>id</th><th></th><th></th></tr></thead>'
        html += '<tbody>'

        for (let r in resources) {
                html += '<tr>'
                let res = resources[r][1];
                let res_id = ("guid" in res.metadata) ? res.metadata.guid : res.metadata.id;
                let isBold = (deployment_id == res_id);
                let sbold = isBold ? '<b>' : '';
                let ebold = isBold ? '</b>' : '';
                html += '<td>' + sbold + res.entity.name + ebold + '</td>';
                if ('hardware_spec' in res.entity)  {
                        html += '<td>' + sbold + res.entity.hardware_spec.name + ebold + '</td>';
                        html += '<td>' + sbold + res.entity.hardware_spec.num_nodes + ebold + '</td>';
                } else if ('compute' in res.entity)  {
                        html += '<td>' + sbold + res.entity.compute.name + ebold + '</td>';
                        html += '<td>' + sbold + res.entity.compute.nodes + ebold + '</td>';
                } else {
                        html += '<td></td>';
                        html += '<td></td>';
                }
                html += '<td>' + sbold + res.entity.status.state + ebold + '</td>';
                html += '<td>' + sbold + res.metadata.created_at + ebold + '</td>';
                html += '<td>' + sbold + res_id + ebold + '</td>';
                if (isBold) {
                        html += '<td></td>';
                } else {
                        html += '<td>' + sbold + '<div id="DEPLOYMENT_SELECT_'+res_id+'" style="cursor:pointer">SELECT</div>'+ ebold +'</td>';
                }
                html += '<td>' + sbold + '<div id="DEPLOYMENT_DELETE_'+res_id+'" style="cursor:pointer">DELETE</div>'+ ebold + '</td>';
                html += '</tr/>';                       
        }
        html += '</tbody>';
        html += '</table>';
        div.innerHTML = html;
        for (let r in resources) {
                let res = resources[r][1];
                let res_id = ("guid" in res.metadata) ? res.metadata.guid : res.metadata.id;
                document.getElementById('DEPLOYMENT_DELETE_'+res_id).onclick = function() {
                    deleteDeployment(res_id);
                }
                let isBold = (deployment_id == res_id);
                if (!isBold)
                    document.getElementById('DEPLOYMENT_SELECT_'+res_id).onclick = function() {
                        getJobs(res_id);
                    }
            }
        document.getElementById('REFRESH_DEPLOYMENTS').onclick = function() {
                getDeployments();
        }
}
function getDeployments() {
        div = document.getElementById("deployments_div");
        div.innerHTML = "... UPDATING DEPLOYMENTS LIST ...";
        axios({
                method:'get',
                url:'/api/deployments',
                responseType:'json',
              })
        .then(function (response) {
                
                // Create items array
                var resources = Object.keys(response.data.resources).map(function(key) {
                        return [key, response.data.resources[key]];
                });
                
                        // Sort the array based on the second element
                resources.sort(function(first, second) {
                        return Date.parse(second[1].metadata.created_at) - Date.parse(first[1].metadata.created_at);
                });
        
                deployments = resources;
                showDeployments();

        });
}    

function changeCredentials() {
        let credentials = JSON.parse(document.getElementById("credentials").value);

        document.getElementById("credentials").value = "";

        axios({
                method:'put',
                url:'/api/credentials',
                responseType:'json',
                data:credentials
              })
        .then(function (response) {
                getDeployments();

        });

}
