import { useState, useEffect, useRef, ChangeEvent } from "react"
import Axios from "axios"
import "./App.css"
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css" // Import Leaflet CSS
import "bootstrap/dist/css/bootstrap.min.css"
import Button from "react-bootstrap/Button"
import ButtonGroup from "react-bootstrap/ButtonGroup"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
// import ReactSelect from "react-windowed-select" //React window to speed up loading of react select options
// import { FixedSizeList } from "react-window"
//import { TrinityRingsSpinner } from "react-epic-spinners"
import L from "leaflet"

import GeoOpenContent from "./GeoOpenContent.tsx"
import GeoClosedContent from "./GeoClosedContent.jsx"
// import LatLongMode from "./LatLongMode.jsx"
// import AxisMode from "./AxisMode.jsx"

function App() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  //For checking backend status, if it is ready, it will be used to allow user to interact with app
  const [backendStatus, setBackendStatus] = useState<string>("Checking...")
  const [vehref, setVehRef] = useState<Array<string>>([])
  const [selectedLineOption, setSelectedLineOption] = useState<string | null>(null)
  const [lineref, setLineRef] = useState<Array<string>>([])
  //Main data input to leaflet
  const [GeoToLeaflet, setGeoToLeaflet] = useState<GeoJSON.FeatureCollection | null>(null)

  // const [center, setCenter] = useState(L.latLng(50.5, 30.5))
  // Controls the side bar
  const [navOpen, setNavOpen] = useState<boolean>(false)
  //needed to move map
  const mapRef = useRef(null) // Add this line to create the mapRef

  //const [trueBounds, setTrueBounds] = useState()
  //For the mouse clicking on the map to show feature details
  interface GeoFeature {
    id: string
    // other properties...
  }
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null) // used to see which place the user has selected

  // Controls the geo information toggle button
  const [sideBarMode, setSideBarMode] = useState("Bus")

  //For saving history of ref and line
  const [historyVehRef, setHistoryVehRef] = useState<Array<string>>(JSON.parse(localStorage.getItem("historyVehRef") || "") || [])
  const [historyLine, setHistoryLine] = useState<Array<string>>(JSON.parse(localStorage.getItem("historyLine") || "") || [])

  //For alert messages
  const [ToastMessage, setToastMessage] = useState()

  //For switching modes between straight route and actual route
  const [actualGeoMode, setActualGeoMode] = useState(false)

  //this const is used to store latlong geojson data
  const [GeoByCurveRoute, setGeoByCurveRoute] = useState<GeoJSON.FeatureCollection | null>(null)

  //For tracking whether need to update GeoByCurveRoute
  const [newSearch, setNewSearch] = useState(false)

  //This const is used to store the straight route geoJSOn data when user switch to actualGeoMode
  const [geoByStraightRoute, setGeoByStraightRoute] = useState<GeoJSON.FeatureCollection | null>(null)

  //Saving the first closest start point and the last
  const [closestStart, setClosestStart] = useState([])
  const [closestGoal, setClosestGoal] = useState([])

  //This const is used to change the hue of the marker color
  const markerHueChangeClass = "huechange"

  //This const is to set the loading state
  const [isLoading, setIsLoading] = useState(false)
  const [positionMarker, setPositionMarker] = useState([40.662674, -73.957116])

  const handleDropdownChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value)
  }

  const handleDropdownLineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedLineOption(event.target.value)
  }

  const checkServer = async () => {
    try {
      const response = await Axios.get("https://nyc-bus-engine-k3q4yvzczq-an.a.run.app/api/bus_trip/ready", {
        withCredentials: false,
      })

      if (response.status === 200) {
        if (response.data.status === "Ready") {
          setBackendStatus("Backend is ready!")
          setNavOpen(true)
          fetchBus(), fetchLine()
        } else if (response.data.status === "Wait") {
          setBackendStatus("Backend is not ready.")
          // Retry after 20 seconds
          setTimeout(checkServer, 10000)
        }
      }
    } catch (error) {
      console.error("There was a problem checking the backend status:", error)
      setBackendStatus("Error checking backend status")
      // Retry after 20 seconds
      setTimeout(checkServer, 20000)
    }
  }

  useEffect(() => {
    // Initial check
    checkServer(), fetchBus(), fetchLine()
  }, [])

  useEffect(() => {
    // Checker
    console.log("Changes detected!!!!!!!1")
    console.log("selectedOption" + selectedOption)
    console.log(selectedOption)
  }, [selectedOption])

  // Fetch bus groups from the backend
  const fetchBus = async () => {
    try {
      const response = await Axios.get("https://nyc-bus-engine-k3q4yvzczq-an.a.run.app/api/bus_trip/getVehRef", {
        withCredentials: false,
      })
      // Check the response from the server and set the message accordingly
      if (response.status === 200) {
        setVehRef(response.data.sort())
      }
    } catch (e) {
      //console.log(selectedGroup) // Note: This is just for reference, you can remove it
      console.log("There was a problem from Group Fetch")
      console.log(e)
    }
  }

  // Fetch bus groups from the backend
  const fetchLine = async () => {
    try {
      const response = await Axios.get("https://nyc-bus-engine-k3q4yvzczq-an.a.run.app/api/bus_trip/getPubLineName", {
        withCredentials: false,
      })
      // Check the response from the server and set the message accordingly
      if (response.status === 200) {
        setLineRef(response.data.sort())
      }
    } catch (e) {
      //console.log(selectedGroup) // Note: This is just for reference, you can remove it
      console.log("There was a problem from reference line Fetch")
      console.log(e)
    }
  }

  // Fetch geo details using bus
  useEffect(() => {
    const fetchGeoByVehRef = async () => {
      if (selectedOption != null) {
        console.log("setIsLoading true")
        setIsLoading(true)
        //Always start with straight lines first
        setActualGeoMode(false)
        let axiosQuote = "https://nyc-bus-engine-k3q4yvzczq-an.a.run.app/api/bus_trip/getBusTripByVehRef/"
        axiosQuote = axiosQuote + selectedOption
        try {
          const response = await Axios.get(axiosQuote, {
            withCredentials: false,
          })
          // Check the response from the server and set the message accordingly
          if (response.status === 200) {
            setSelectedLineOption("")
            console.log(response.data)
            console.log(response.data.type)
            if (response.data.type === "FeatureCollection") {
              const geoJsonWithIds = {
                ...response.data,
                features: response.data.features.map((feature: object, index: string) => ({
                  ...feature,
                  id: index, // Put a new index for select colour
                })),
              }
              setGeoToLeaflet(geoJsonWithIds)
              console.log(GeoToLeaflet)
            } else {
              setGeoToLeaflet(response.data)
              console.log(GeoToLeaflet)
            }

            console.log(GeoToLeaflet)
            console.log(response.data)
            // Use the getBounds() method to get the bounds of the GeoJSON layer
            const geoJSONLayer = L.geoJSON(response.data)
            const truebounds = geoJSONLayer.getBounds()
            // mapRef.current.flyToBounds(truebounds)
            const map = useMap()
            if (map) {
              map.flyToBounds(truebounds)
            }

            //Call function to record history
            recordHistory("historyVehRef", historyVehRef, selectedOption)
            console.log(historyVehRef)
            console.log(GeoToLeaflet)
            //set new search equals true as this is a new search
            setNewSearch(true)
            //record for toggle use
            setGeoByStraightRoute(GeoToLeaflet)
            //SetLoading false
            console.log("setIsLoading false")
            setIsLoading(false)
            //Toasify to show display
            toast.success("Displaying Vehicle Reference: " + selectedOption)
          }
        } catch (e) {
          //console.log(selectedGroup) // Note: This is just for reference, you can remove it
          console.log("There was a problem from Geo By Bus")
          console.log(e)
          //SetLoading false
          console.log("setIsLoading false")
          setIsLoading(false)
        }
      }
    }
    fetchGeoByVehRef()
  }, [selectedOption])

  // Fetch geo details using bus
  useEffect(() => {
    const fetchGeoByLine = async () => {
      if (selectedLineOption != null) {
        console.log("setIsLoading true")
        setIsLoading(true)
        //Always start with straight lines first
        setActualGeoMode(false)
        let axiosQuote = "https://nyc-bus-engine-k3q4yvzczq-an.a.run.app/api/bus_trip/getBusTripByPubLineName/"
        axiosQuote = axiosQuote + selectedLineOption
        try {
          const response = await Axios.get(axiosQuote, {
            withCredentials: false,
          })
          // Check the response from the server and set the message accordingly
          if (response.status === 200) {
            console.log(response.data)
            setSelectedOption("")
            //setGeoToLeaflet(response.data)
            if (response.data.type === "FeatureCollection") {
              const geoJsonWithIds = {
                ...response.data,
                features: response.data.features.map((feature: object, index: string) => ({
                  ...feature,
                  id: index, // Put a new index for select colour
                })),
              }
              setGeoToLeaflet(geoJsonWithIds)
            } else {
              setGeoToLeaflet(response.data)
            }

            // Use the getBounds() method to get the bounds of the GeoJSON layer
            const geoJSONLayer = L.geoJSON(response.data)
            const truebounds = geoJSONLayer.getBounds()

            // Fit the map to the new bounds
            console.log(truebounds)

            //make map go there
            // mapRef.current.flyToBounds(truebounds)
            const map = useMap()
            if (map) {
              map.flyToBounds(truebounds)
            }
            //Call function to record
            recordHistory("historyLine", historyLine, selectedLineOption)
            console.log(historyLine)
            //record for toggle use
            setGeoByStraightRoute(GeoToLeaflet)
            //set new search equals true as this is a new search
            setNewSearch(true)
            console.log("setIsLoading false")
            setIsLoading(false)
            toast.success("Displaying Published Line: " + selectedLineOption)
          }
        } catch (e) {
          //console.log(selectedGroup) // Note: This is just for reference, you can remove it
          console.log("There was a problem from Geo By veh ref")
          console.log(e)
          //SetLoading false
          console.log("setIsLoading false")
          setIsLoading(false)
        }
      }
    }
    fetchGeoByLine()
  }, [selectedLineOption])

  /* Set the width of the side navigation to 250px */
  async function openNav() {
    if (backendStatus === "Backend is ready!") {
      setNavOpen(true)
    }
  }

  async function closeNav() {
    setNavOpen(false)
  }

  //Allows toggling of the sidebar content to show whether geo info or selection
  async function toggleMode(mode: string) {
    if (mode === "back") {
      setSideBarMode
    } else {
      setSideBarMode(mode)
    }
    console.log("toggling to " + mode)
    //}
  }

  // To map our options so that we can use in react select, failure to map results in frontend dropdown box unable
  // to display currently selected options
  const vehOptions = vehref.map((reference) => ({ value: reference, label: reference }))
  const lineOptions = lineref.map((reference) => ({ value: reference, label: reference }))

  //use for react-window-select, to resolve the slow loading, use lazy loading
  // const CustomVehOption = ({ data, index, style }) => {
  //   const option = data[index]
  //   return <div style={style}>{option.label}</div>
  // }

  //Record History in state AND local storage
  async function recordHistory(storageArrayName: string, historyArray: Array<string>, selection: string) {
    if (historyArray.includes(selection)) {
      historyArray.splice(historyArray.indexOf(selection), 1)
      console.log("splicing")
    }
    historyArray.unshift(selection)
    console.log(historyArray)
    if (historyArray.length > 5) {
      historyArray.pop()
      console.log(historyArray)
      console.log("shifting")
    }
    localStorage.setItem(storageArrayName, JSON.stringify(historyArray))
    //currently thinking how to store name?
  }
  //Clear History
  async function clearHistory(target: string) {
    if (target === "historyLine") {
      if (localStorage.getItem("historyLine") === null) {
        toast.error("Published Line history is empty!")
      }

      if (localStorage.getItem("historyLine") !== null) {
        setHistoryLine([])
        localStorage.removeItem("historyLine")
        if (localStorage.getItem("historyLine") === null) {
          toast.success("Published Line history cleared")
        }
      }
    }
    if (target === "historyVehRef") {
      if (localStorage.getItem("historyVehRef") === null) {
        toast.error("Vehicle Reference history is empty!")
      }

      if (localStorage.getItem("historyVehRef") !== null) {
        setHistoryVehRef([])
        localStorage.removeItem("historyVehRef")
        if (localStorage.getItem("historyVehRef") === null) {
          toast.success("Vehicle Reference history cleared")
        }
      }
    }
    console.log(historyLine)
  }
  ///////////////////////////////////////////////////////////////////
  //Colour of the marker on leaflet
  ///////////////////////////////////////////////////////////////////
  // Function to handle marker click and change its color
  // Define the CSS class for marker hue change
  async function handleMarkerClick(marker: L.Marker) {
    console.log("Handlemarkerclick")
    await new Promise((resolve) => setTimeout(resolve, 0))
    console.log("selectedfeature" + selectedFeature)

    // Remove the huechange class from all markers
    switchOffAllMarkers()

    // Get the DOM element associated with the marker
    const iconElement = marker.getElement()

    if (iconElement) {
      // Check if the 'huechange' class is already present
      const hasHueChangeClass = iconElement.classList.contains("huechange")

      // Toggle the 'huechange' class
      if (!hasHueChangeClass) {
        iconElement.classList.add("huechange") // Add the class
      } else {
        iconElement.classList.remove("huechange") // Remove the class
      }
    }
  }

  // useEffect(() => {
  //   // This effect runs whenever selectedFeature changes
  //   console.log("Selected feature changed:", selectedFeature)
  //   console.log(selectedFeature.feature)
  //   if (selectedFeature.feature !== undefined) {
  //     handleMarkerClick(selectedFeature) // Call handleMarkerClick with the updated selectedFeature
  //   }
  // }, [selectedFeature]) // This effect depends on selectedFeature

  ///////////////////////////////////////////////////////////////
  //This function will turn all markers back to blue(off indicator)
  ///////////////////////////////////////////////////////////////
  async function switchOffAllMarkers() {
    console.log("TURN OFF ALL MARKER")
    const allMarkers = document.querySelectorAll(".leaflet-marker-icon")
    allMarkers.forEach((m) => {
      m.classList.remove("huechange")
    })
  }
  return (
    <>
      <div className="header" style={{ height: "10vh", overflowX: "auto" }}>
        <button className="openbtn" onClick={openNav} style={{ backgroundColor: backendStatus === "Backend is ready!" ? "green" : "red" }}>
          &#9776; {backendStatus === "Backend is ready!" ? "" : "Server not ready"}
        </button>
        <div id="header-title">
          <h2>Geo Bus</h2>
        </div>
      </div>
      <div>
        <ToastContainer />
      </div>
      <div id="mySidenav" className={navOpen ? "sidenav-open" : "sidenav-close"} style={{ width: navOpen ? "60vh" : 0, height: "100%", overflowY: "auto" }}>
        {isLoading === false ? (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 25 }}>
              <a href="#" className="closebtn" onClick={closeNav}>
                &times;
              </a>
            </div>

            <ButtonGroup aria-label="Basic example">
              <Button variant={sideBarMode === "Bus" ? "dark" : "outline-dark"} onClick={() => toggleMode("Bus")} active={sideBarMode === "Bus"}>
                Bus Route
              </Button>
              {/* <Button variant="secondary" onClick={switchLatLong} active={sideBarMode === "LatLong"}>
            LatLong
          </Button> */}
              <Button variant={sideBarMode === "Axis" ? "dark" : "outline-dark"} onClick={() => toggleMode("Axis")} active={sideBarMode === "Axis"}>
                Road Type
              </Button>
              <Button variant={sideBarMode === "Info" ? "dark" : "outline-dark"} onClick={() => toggleMode("Info")} active={sideBarMode === "Info"}>
                Info
              </Button>
            </ButtonGroup>

            {sideBarMode === "Bus" && <GeoClosedContent selectedOption={selectedOption} setSelectedOption={setSelectedOption} selectedLineOption={selectedLineOption} setSelectedLineOption={setSelectedLineOption} handleDropdownChange={handleDropdownChange} handleDropdownLineChange={handleDropdownLineChange} vehOptions={vehOptions} lineOptions={lineOptions} historyLine={historyLine} historyVehRef={historyVehRef} clearHistory={clearHistory} GeoToLeaflet={GeoToLeaflet} setGeoToLeaflet={setGeoToLeaflet} GeoByCurveRoute={GeoByCurveRoute} setGeoByCurveRoute={setGeoByCurveRoute} isLoading={isLoading} setIsLoading={setIsLoading} actualGeoMode={actualGeoMode} setActualGeoMode={setActualGeoMode} geoByStraightRoute={geoByStraightRoute} setGeoByStraightRoute={setGeoByStraightRoute} newSearch={newSearch} setNewSearch={setNewSearch} />}

            {sideBarMode === "Info" && <GeoOpenContent selectedOption={selectedOption} selectedLineOption={selectedLineOption} selectedFeature={selectedFeature} setSelectedFeature={setSelectedFeature} />}

            {sideBarMode === "Info" && !selectedFeature && <div>Please select a line to see more information</div>}
          </div>
        ) : (
          <div className="loader" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
            {/* <TrinityRingsSpinner color="green" size="150"></TrinityRingsSpinner> */}
          </div>
        )}
      </div>
      <div className="ForMap" style={{ height: "90vh", transition: "margin-left 0.5s" }}>
        <MapContainer ref={mapRef} center={L.latLng(40.7, -73.5)} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          {/* Conditionally render GeoJSON when GeoToLeaflet has data */}
          {GeoToLeaflet && (
            <GeoJSON
              key={JSON.stringify(GeoToLeaflet)}
              data={GeoToLeaflet}
              style={(feature) => ({
                color: selectedFeature && feature && selectedFeature.id === feature.id ? "red" : "blue",
              })}
              onEachFeature={(feature, layer) => {
                // Update the selected marker when clicked
                if (layer instanceof L.Marker) {
                  layer.on("click", () => {
                    //console.log("layerfeature" + layer.feature)
                    //console.log("selectedfeature" + selectedFeature)
                    //setSelectedFeature(layer)
                    console.log("selectedfeature" + selectedFeature)
                    console.log("OPTION 1")
                    handleMarkerClick(layer)
                    //switchOffAllMarkers()
                    toggleMode("Info")
                  })
                  //handle selecting lines
                } else {
                  layer.on("click", () => {
                    //setSelectedFeature(feature)
                    console.log(feature)
                    console.log("OPTION 2")
                    switchOffAllMarkers()
                    toggleMode("Info")
                  })
                }
              }}
            />
          )}
        </MapContainer>
      </div>
    </>
  )
}

export default App
