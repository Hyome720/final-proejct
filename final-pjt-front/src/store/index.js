import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import createPersistedState from 'vuex-persistedstate'
import api from "@/api/api"
import router from "@/router"

import { BootstrapVue, IconsPlugin, FormRatingPlugin } from 'bootstrap-vue'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.use(Vuex)
Vue.use(BootstrapVue, IconsPlugin, FormRatingPlugin)

export default new Vuex.Store({
  plugins: [
    createPersistedState({
      // key: 'vuex',              
      // reducer (val) {                                
      //   if(val.authentication.token === null) { // return empty state when user logged out                
      //     return {}
      //   }
      //   return val
      // }
    })
  ],
  state: {
    token: null,
    currUser: null,
    userProfile: null,

    recommendMovies: null,
    nowPlayingMovies: null,
    actionMovies: null,
    romanceMovies: null,
    query: '',
    searchResults: '',
    currProfile: null, // {username: '', nickname: ''}
    selectedMovies: [],
  },
  getters: {
    isLogin: state => !!state.token,
    shuffledRecommendMovies(state) {
      const arr = state.recommendMovies
      let m = arr.length;
      while (m) {
        const i = Math.floor(Math.random() * m--);
        [arr[m], arr[i]] = [arr[i], arr[m]];
      }
      return arr
    },
    shuffledNowPlayingMovies(state) {
      const arr = state.nowPlayingMovies
      let m = arr.length;
      while (m) {
        const i = Math.floor(Math.random() * m--);
        [arr[m], arr[i]] = [arr[i], arr[m]];
      }
      return arr
    },
  },
  mutations: {
    SAVE_TOKEN(state, token) {
      state.token = token
    },
    REMOVE_TOKEN(state) {
      state.token = null
      state.currUser = null
      localStorage.removeItem('vuex')
    },
    SAVE_USER_DATA(state, userData) {
      state.currUser = userData
    },
    SAVE_USER_PROFILE(state, userData) {
      state.userProfile = userData
    },

    SAVE_RECOMMEND: (state, payload) => state.recommendMovies = payload,
    SAVE_NOW_PLAYING: (state, payload) => state.nowPlayingMovies = payload,
    SAVE_ACTION: (state, payload) => state.actionMovies = payload,
    SAVE_ROMANCE: (state, payload) => state.romanceMovies = payload,
    SET_SEARCH_RESULTS: (state, payload) => state.searchResults = payload,

    // 지금 클릭한 리뷰의 작성자 유저 정보
    SAVE_CURR_PROFILE: (state, payload) => state.currProfile = payload,
  },
  actions: {
    //////////////// accounts ////////////////
    signUp(context, userData) {
      const formData = new FormData()
      formData.append('username', userData.userId)
      formData.append('nickname', userData.nickname)
      formData.append('password1', userData.password1)
      formData.append('password2', userData.password2)
      if (userData.profile_image){
        formData.append('profile_image', userData.profile_image)
      }
      // console.log(formData)
      axios({
        method: 'post',
        url: api.accounts.signup(),
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })
        .then((res) => {
          const token = res.data.key
          context.commit('SAVE_TOKEN', token) // token
          context.dispatch('getCurrUser')
          router.push({ name: 'MainView' })
        })
        .catch((err) => {
          console.log(err)
          alert(err.message)
        })
    },
    logIn(context, userData) {
      axios({
        method: 'post',
        url: api.accounts.login(),
        data: {
          username: userData.username,
          password: userData.password,
        }
      })
        .then((res) => {
          const token = res.data.key
          context.commit('SAVE_TOKEN', token) // token
          // 로그인되면 유저 정보 가지러가기
          context.dispatch('getCurrUser')
          // 이전 페이지로는 어케가징 ?
          router.push({ name: 'MainView' })
        })
        .catch((err) => {
          console.log(err)
          alert('아이디 혹은 비밀번호가 일치하지 않아요!')
        })
    },
    logOut(context, userData) {
      axios({
        method: 'post',
        url: api.accounts.logout(),
        data: userData,
      })
        .then(() => {
          context.commit('REMOVE_TOKEN')
          // alert('로그아웃 완료')
          router.push({ name: 'MainView' })
        })
        .catch((err) => {
          console.log(err)
          // alert(err.message)
        })
    },
    getCurrUser(context) {
      console.log('유저정보 가져올게')
      if (context.getters.isLogin) {
        axios({
          method: 'get',
          url: api.accounts.currUserName(),
          headers: {
            Authorization: `Token ${ context.state.token }`
          }
        })
          .then((res) => {
            console.log(res)
            console.log(res.data.username);
            axios({
              method: 'get',
              url: api.accounts.currUserInfo(res.data.username),
              headers: {
                Authorization: `Token ${ context.state.token }`
              }
            })
              .then((res) => {
                context.commit('SAVE_USER_DATA', res.data)
              })
              .catch((err) => {
                console.log(err)
                alert(err.message)
                context.commit('REMOVE_TOKEN')
                router.push({ name: 'LogInView' })
              })
          })
          .catch((err) => {
            console.log(err)
            alert(err.message)
            context.commit('REMOVE_TOKEN')
            router.push({ name: 'LogInView' })
          })
      }
    },

    //////////////// movies ////////////////
    fetchRecommendMovies(context) {
      // 로그인 했다면 맞춤 추천, 안했다면 TMDB 추천
      if (this.state.token) {
        axios({
          method: 'get',
          url: api.movies.recommendMovies(),
        })
          .then((res) => {
            // console.log(res)
            context.commit('SAVE_RECOMMEND', res)
          })
          .catch((error) => {
            console.log(error)
          })
      } else {
        const MOVIE_URL = 'https://api.themoviedb.org/3/movie/popular'
        axios({
          method: 'get',
          // url: api.movies.recommendMovies(),
          url: MOVIE_URL,
          params: {
            api_key : process.env.VUE_APP_TMDB,
            language: 'ko-KR',
          }
        })
          .then((res) => {
            // console.log(res)
            // context.commit('SAVE_RECOMMEND', res)
  
            // console.log(res.data.results)
            context.commit('SAVE_RECOMMEND', res.data.results)
          })
          .catch((error) => {
            console.log(error)
          })
      }
    },
    fetchNowPlayingMovies(context) {
      const MOVIE_URL = 'https://api.themoviedb.org/3/movie/now_playing'
      axios({
        method: 'get',
        // url: api.movies.nowPlayingMovies(),
        url: MOVIE_URL,
        params: {
          api_key : process.env.VUE_APP_TMDB,
          language: 'ko-KR',
        }
      })
        .then((response) => {
          let res = response.data.results
          // console.log(res)
          context.commit('SAVE_NOW_PLAYING', res)
          // console.log(context.state.nowPlayingMovies)
          for (const movie of res) {
            // DB에 있다면 DB 정보 가져오기
            const API_URL = 'http://127.0.0.1:8000'
            axios.get(API_URL + `/movies/${movie.id}/`)
            .then(() => {
              // console.log(res.data)
              // this.movie = res.data
            })
            .catch((error) => {
              console.log('DB에 없어')
              console.log(error)

              // DB에 없으면 TMDB에서 가져온 데이터를 DB에 저장
              console.log('저장하러간다')
              axios({
                method: 'post',
                url: API_URL + '/movies/',
                headers: {
                  Authorization: `Token ${this.token}`
                },
                data: {
                  title: movie['title'],
                  overview: movie['overview'],
                  release_date: movie['release_date'],
                  id: movie['id'],
                  adult: movie['adult'],
                  popularity: movie['popularity'],
                  vote_average: movie['vote_average'],
                  vote_count: movie['vote_count'],
                  poster_path: movie['poster_path'],
                  backdrop_path: movie['backdrop_path'],
                }
              })
                .then((response) => {
                  // console.log(this.movie)
                  console.log('저장완료', response)
                })
                .catch((error) => {
                  console.log('아직 post 없음', error)
                })
            })
        }
      })
        .catch((error) => {
          console.log(error)
        })
    },
    fetchActionMovies(context) {
      axios({
        mehod: 'get',
        url: api.movies.actionMovies()
      })
        .then((response) => {
          console.log(response.data)
          context.commit('SAVE_ACTION', response.data)
        })
        .catch((error) => {
          console.log(error)
        })
    },
    fetchRomanceMovies(context) {
      axios({
        mehod: 'get',
        url: api.movies.romanceMovies()
      })
        .then((response) => {
          // console.log(response.data)
          context.commit('SAVE_ROMANCE', response.data)
        })
        .catch((error) => {
          console.log(error)
        })
    },
    showSearchPage(context, query) {  
      axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.VUE_APP_TMDB}&language=ko&query=` + query + '&include_adult=false')
        .then((res) => {
          context.commit('SET_SEARCH_RESULTS', res.data.results)
          router.push({name: 'MovieSearchView', params: { query: query }})
        })
        .catch((err) => {
          console.log(err)
          console.log('서치에러')
        })
    },
    getUserProfile(context) {
      axios({
        method: 'get',
        url: api.movies.getUserProfile(context.state.currUser.username),
        headers: {
          Authorization: `Token ${ context.state.token }`
        }
      })
        .then((res) => {
          // console.log('유저가쓴리뷰')
          // console.log(res)
          context.commit('SAVE_USER_PROFILE', res.data)
        })
        .catch((err) => {
          if (err.response.data.detail === '찾을 수 없습니다.') {
            context.commit('SAVE_USER_PROFILE', [])
          }
          console.log(err)
        })
    }
  },
})