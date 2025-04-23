// Main JavaScript for the Haunted Places Visualization

// Show loading indicator
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error');
const errorMessage = document.getElementById('error-message');

// Function to create the legend
function createLegend(colorScale, minCount, maxCount) {
    const legendContainer = document.querySelector('.legend-items');
    legendContainer.innerHTML = '';
    
    // Create a range of values to show in the legend
    const step = Math.round((maxCount - minCount) / 5);
    const values = [];
    
    for (let i = 0; i <= 5; i++) {
        values.push(minCount + i * step);
    }
    
    // Create legend items
    values.forEach((value, i) => {
        if (i === 0) return; // Skip the first value to avoid overcrowding
        
        // const legendItem = document.createElement('div');
        // legendItem.className = 'legend-item';
        
        // const colorBox = document.createElement('div');
        // colorBox.className = 'legend-color';
        // colorBox.style.backgroundColor = colorScale(value);
        
        // const label = document.createElement('span');
        // label.textContent = value;
        
        // legendItem.appendChild(colorBox);
        // legendItem.appendChild(label);
        // legendContainer.appendChild(legendItem);
    });
}

// Load data and create visualization
document.addEventListener('DOMContentLoaded', () => {
    // Load both JSON files: one for aggregated haunted data, one for TopoJSON map data
    Promise.all([
        d3.json("data/haunted_places_state_counts.json"),
        d3.json("data/counties-albers-10m.json")
    ]).then(function([stateData, us]) {
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
        
        console.log("State Data:", stateData);
        console.log("US TopoJSON:", us);
        
        // Create a lookup Map for haunted counts using state name as key
        const frequencyMap = new Map(stateData.map(d => [d.state, d.count]));
        
        // Define the color scale using d3.schemeReds (deep red for higher counts)
        const minCount = d3.min(stateData, d => d.count);
        const maxCount = d3.max(stateData, d => d.count);
        const color = d3.scaleQuantize()
                        .domain([minCount, maxCount])
                        .range(d3.schemeReds[9]);
        
        // Create the legend
        createLegend(color, minCount, maxCount);
        
        // Calculate responsive dimensions
        const containerWidth = document.getElementById('visualization').clientWidth;
        const aspectRatio = 610 / 975; // Original SVG aspect ratio
        const height = containerWidth * aspectRatio;
        
        // Append an SVG container within the #visualization section
        const svg = d3.select("#visualization")
                      .append("svg")
                      .attr("viewBox", `0 0 975 610`)
                      .attr("width", containerWidth)
                      .attr("height", height)
                      .attr("preserveAspectRatio", "xMidYMid meet");
        
        // Create a geographic path generator
        const path = d3.geoPath();
        
        // Extract state features from the TopoJSON file
        const states = topojson.feature(us, us.objects.states).features;
        
        // Draw each state
        const statePaths = svg.append("g")
           .selectAll("path")
           .data(states)
           .join("path")
           .attr("fill", d => {
             const count = frequencyMap.get(d.properties.name);
             return count != null ? color(count) : "#ccc";
           })
           .attr("d", path)
           .on("click", (event, d) => {
             const stateName = d.properties.name;
             const count = frequencyMap.get(stateName) || 0;
             
             // Highlight the selected state
             statePaths.attr("stroke", null).attr("stroke-width", null);
             d3.select(event.currentTarget)
               .attr("stroke", "#fff")
               .attr("stroke-width", 2);
             
             // Update info panel
             d3.select("#info")
               .html(`
                 <h3>${stateName}</h3>
                 <p><strong>Haunted Places:</strong> ${count}</p>
                 <p><strong>Rank:</strong> ${getStateRank(stateName, stateData)}</p>
                 <p class="note">This state has ${getDescription(count)} reported haunted locations.</p>
               `);
           });
        
        // Add tooltips
        statePaths.append("title")
           .text(d => `${d.properties.name}\nHaunted Places: ${frequencyMap.get(d.properties.name) || 0}`);
        
        // Draw state borders using a TopoJSON mesh
        svg.append("path")
           .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
           .attr("fill", "none")
           .attr("stroke", "#333")
           .attr("stroke-linejoin", "round")
           .attr("d", path);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const newWidth = document.getElementById('visualization').clientWidth;
            const newHeight = newWidth * aspectRatio;
            
            svg.attr("width", newWidth)
               .attr("height", newHeight);
        });
        
    }).catch(function(error) {
        console.error("Error loading data:", error);
        // Show error message
        loadingIndicator.classList.add('hidden');
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = `Failed to load map data: ${error.message}`;
    });
});

// Helper function to get state rank based on haunted place count
function getStateRank(stateName, stateData) {
    // Sort states by count in descending order
    const sortedStates = [...stateData].sort((a, b) => b.count - a.count);
    
    // Find the index of the state (adding 1 to get rank starting from 1)
    const rank = sortedStates.findIndex(d => d.state === stateName) + 1;
    
    // Handle case where state isn't found
    return rank > 0 ? `${rank} of ${stateData.length}` : "Not ranked";
}

// Helper function to get description based on count
function getDescription(count) {
    if (count > 100) return "a very high number of";
    if (count > 50) return "a significant number of";
    if (count > 20) return "a moderate number of";
    if (count > 10) return "several";
    if (count > 0) return "a few";
    return "no";
}
