import React, { Component } from "react";
import NavBar from "./NavBar";
import Profile from "./Profile";
import Education from "./Education";
import Projects from "./Projects";
import Experience from "./Experience";
import Extras from "./Extras";
import axios from "axios";

export class Resume extends Component {

  componentDidMount() {
    // const data = {
    //   ...this.props.user,
    // };

    axios.get(`https://resume-builder-qrws.onrender.com/fetch-pdf?email=${this.props.user.email}`)
      .then((res) => {
        if (res.data.fileUrl) {
          this.setState({ resumeUrl: res.data.fileUrl });
        } else {
          console.log("Resume not found");
        }
      })
      .catch((error) => {
        console.error("Error fetching resume:", error);
      });
  }

  handleDownloadResume = async () => {
    this.setState({ loading: true });

    try {
      // Create a complete data object with all resume fields
      const resumeData = {
        ...this.state,
        email: this.props.user.email
      };

      // Send the request with increased timeout
      const createPdfResponse = await axios.post("https://resume-builder-qrws.onrender.com/create-pdf", resumeData, {
        timeout: 300000 // 5 minutes timeout
      });

      if (createPdfResponse.data.fileUrl) {
        // Open the file in a new tab
        window.open(createPdfResponse.data.fileUrl, "_blank");
        this.setState({ resumeUrl: createPdfResponse.data.fileUrl });
      } else {
        throw new Error("PDF generation failed - no URL returned");
      }
    } catch (error) {
      console.error("Error generating resume:", error);
      alert("Failed to generate resume. The server might be busy. Please try again in a moment.");
    } finally {
      this.setState({ loading: false });
    }
  };

  state = {
    step: 1,
    loading: false,
    resumeUrl: null,
    // Personal Profile Details...
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    website: "",
    github: "",
    linkedin: "",
    facebook: "",
    instagram: "",

    // Education Information
    college: "",
    fromyear1: "",
    toyear1: "",
    qualification1: "",
    description1: "",
    school: "",
    fromyear2: "",
    toyear2: "",
    qualification2: "",
    description2: "",

    // Project Information...
    title1: "",
    link1: "",
    projectDescription1: "",
    title2: "",
    link2: "",
    projectDescription2: "",
    title3: "",
    link3: "",
    projectDescription3: "",

    // Experience Information
    institute1: "",
    position1: "",
    duration1: "",
    experienceDescription1: "",
    institute2: "",
    position2: "",
    duration2: "",
    experienceDescription2: "",

    // Extra Information
    skill1: "",
    skill2: "",
    skill3: "",
    skill4: "",
    skill5: "",
    skill6: "",
    interest1: "",
    interest2: "",
    interest3: "",
    interest4: "",
    interest5: "",
    interest6: "",
  };

  nextStep = () => {
    const { step } = this.state;
    this.setState({
      step: step + 1,
    });
  };

  prevStep = () => {
    const { step } = this.state;
    this.setState({
      step: step - 1,
    });
  };

  handleChange = ({ target: { value, name } }) => {
    this.setState({ [name]: value });
  };

  save = () => {
    const data = {
      user: this.props.user,
      resume: this.state,
    };
    const promise = axios
      .post("/save", data)
      .then((res) => res)
      .catch((err) => {
        console.log(err);
      });
    return promise;
  };

  renderDownloadButton = () => {
    // Only show download button when there's sufficient data
    const hasBasicData = this.state.firstname && this.state.lastname && this.state.email;
    
    if (hasBasicData) {
      return (
        <div className="my-4">
          <button
            className="btn btn-success"
            onClick={this.handleDownloadResume}
            disabled={this.state.loading}
          >
            {this.state.loading ? "Generating Resume..." : "Download Resume"}
          </button>
          
          {this.state.resumeUrl && !this.state.loading && (
            <div className="mt-2">
              <a href={this.state.resumeUrl} target="_blank" rel="noopener noreferrer">
                View Last Generated Resume
              </a>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  render() {
    const { step } = this.state;
    const {
      // Profile-Information
      firstname,
      lastname,
      email,
      phone,
      website,
      github,
      linkedin,
      twitter,
      facebook,
      instagram,

      // Education Information
      college,
      fromyear1,
      toyear1,
      qualification1,
      description1,
      school,
      fromyear2,
      toyear2,
      qualification2,
      description2,

      // Project Information...
      title1,
      link1,
      projectDescription1,
      title2,
      link2,
      projectDescription2,
      title3,
      link3,
      projectDescription3,

      // Experience Information
      institute1,
      position1,
      duration1,
      experienceDescription1,
      institute2,
      position2,
      duration2,
      experienceDescription2,

      // Extra Information
      skill1,
      skill2,
      skill3,
      skill4,
      skill5,
      skill6,
      interest1,
      interest2,
      interest3,
      interest4,
      interest5,
      interest6,
    } = this.state;
    const values = {
      // Profile-Information
      firstname,
      lastname,
      email,
      phone,
      website,
      github,
      linkedin,
      twitter,
      facebook,
      instagram,

      // Education Information
      college,
      fromyear1,
      toyear1,
      qualification1,
      description1,
      school,
      fromyear2,
      toyear2,
      qualification2,
      description2,

      // Project Information...
      title1,
      link1,
      projectDescription1,
      title2,
      link2,
      projectDescription2,
      title3,
      link3,
      projectDescription3,

      // Experience Information
      institute1,
      position1,
      duration1,
      experienceDescription1,
      institute2,
      position2,
      duration2,
      experienceDescription2,

      // Extra Information
      skill1,
      skill2,
      skill3,
      skill4,
      skill5,
      skill6,
      interest1,
      interest2,
      interest3,
      interest4,
      interest5,
      interest6,
    };
    switch (step) {
      case 1:
        return (
          <div>
            <NavBar />
            <div className="App mt-3">
              <div className="container col-lg-10 mx-auto text-center">
                <Profile
                  nextStep={this.nextStep}
                  handleChange={this.handleChange}
                  values={values}
                  save={this.save}
                />
                {this.renderDownloadButton()}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <NavBar />
            <div className="App mt-3">
              <div className="container col-lg-10 mx-auto text-center">
                <Education
                  nextStep={this.nextStep}
                  prevStep={this.prevStep}
                  handleChange={this.handleChange}
                  values={values}
                  save={this.save}
                />
                {this.renderDownloadButton()}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <NavBar />
            <div className="App mt-3">
              <div className="container col-lg-8 mx-auto text-center">
                <Projects
                  nextStep={this.nextStep}
                  prevStep={this.prevStep}
                  handleChange={this.handleChange}
                  values={values}
                  save={this.save}
                />
                {this.renderDownloadButton()}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <NavBar />
            <div className="App mt-3">
              <div className="container col-lg-10 mx-auto text-center">
                <Experience
                  nextStep={this.nextStep}
                  prevStep={this.prevStep}
                  handleChange={this.handleChange}
                  values={values}
                  save={this.save}
                />
                {this.renderDownloadButton()}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <NavBar />
            <div className="App mt-3">
              <div className="container col-lg-10 mx-auto text-center">
                <Extras
                  prevStep={this.prevStep}
                  handleChange={this.handleChange}
                  values={values}
                  save={this.save}
                />
                {this.renderDownloadButton()}
              </div>
            </div>
          </div>
        );
      default:
        return <div />;
    }
  }
}

export default Resume;

