import * as actionType from "./constants";
import { shuffleFun, lyricParse } from "@/utils/utilsFun";
import { playWayArr } from "@/common/player-local-data";
import { fetchSongUrl, fetchSongsDetail, fetchListDetail, fetchLyric } from "@/services/player"
import { fetchAlbumSongs } from "@/services/album"

const locationArrAct = arr => {
	return {
		type: actionType.CHANGE_LOCATION_ARR,
		arr
	}
}

const getLocationArr = getState => {
	let playList = getState().getIn(["player", "playList"])
	let playWay = getState().getIn(["player", "playWay"])
	let playIdx = getState().getIn(["player", "playIdx"])
	let locationArr = getState().getIn(["player", "locationArr"])

	let way = playWayArr[playWay]
	let arr = []

	if (way !== 'one') {
		for (let i = 0; i < playList.length; i++) {
			arr.push(i)
		}
		if (way === 'shuffle') {
			arr = shuffleFun(arr)
		}
	} else if (playIdx !== -1) {
		arr.push(locationArr[playIdx])
	} else {
		let idx = playIdx >= 0 ? playIdx : 0
		arr = [idx]
	}

	return arr
}

const changeList = detailArr => {
	return {
		type: actionType.CHANGE_PLAY_LIST,
		playList: detailArr
	}
}

export const getListDetail = ids => {
	return (dispatch, getState) => {
		fetchSongsDetail(ids).then(res => {
			dispatch(changeList(res.songs))
			let arr = getLocationArr(getState)
			dispatch(locationArrAct(arr))
		})
	}
}

const changePlayWay = way => {
	return {
		type: actionType.CHANGE_PLAY_WAY,
		playWay: way
	}
}

export const changeWay = idx => {
	return (dispatch, getState) => {
		let playIdx = getState().getIn(["player", "playIdx"])
		let locationArr = getState().getIn(["player", "locationArr"])
		let playWay = getState().getIn(["player", "playWay"])

		playWay = typeof idx === 'number' ? idx : playWay + 1;
		playWay = playWay > 2 ? 0 : playWay;

		dispatch(changePlayWay(playWay))

		let arr = getLocationArr(getState)
		let nowIdx = locationArr[playIdx]
		let newidx = arr.findIndex(v => v === nowIdx)
		if (newidx !== playIdx) dispatch(changePlaySongIdx(newidx))

		dispatch(locationArrAct(arr))
	}
}

const changePlaySong = song => {
	return {
		type: actionType.CHANGE_PLAYING_SONG,
		song,
	}
}

const changePlaySongIdx = playIdx => {
	return {
		type: actionType.CHANGE_PLAYING_SONG_IDX,
		playIdx,
	}
}

const changePlaySongInfoAct = info => {
	return {
		type: actionType.CHANGE_PLAYING_SONG_INFO,
		info
	}
}

const changeLyric = str => {
	let res = lyricParse(str)
	return {
		type: actionType.CHANGE_LYRIC,
		lyric: res
	}
}

export const changeSong = ActionIdx => {
	return (dispatch, getState) => {
		ActionIdx = !ActionIdx && ActionIdx !== 0 ? 1 : ActionIdx
		let playIdx = getState().getIn(["player", "playIdx"])
		let playWay = getState().getIn(["player", "playWay"])
		let playList = getState().getIn(["player", "playList"])
		let playSong = getState().getIn(["player", "playSong"])
		let locationArr = getState().getIn(["player", "locationArr"])

		if (!playList || playList.length === 0) return;

		// 获取播放顺序得到下一个下标
		let way = playWayArr[playWay]
		let newIdx = playIdx + ActionIdx
		if (newIdx >= playList.length) {
			newIdx = 0
		} else if (newIdx < 0) {
			newIdx = playList.length - 1
		}

		if (playSong.id && way === 'one') {
			dispatch(changePlaySong({ ...playSong }))
		} else {
			let nowSongInfo = playList[locationArr[newIdx]]
			// 获取歌曲
			fetchSongUrl(nowSongInfo.id).then(res => {
				let song = res.data[0]
				dispatch(changePlaySongIdx(newIdx))
				dispatch(changePlaySong(song))
				dispatch(changePlaySongInfoAct({ ...nowSongInfo }))
			})
			// 获取歌词
			fetchLyric(nowSongInfo.id).then(res => {
				res.lrc && dispatch(changeLyric(res.lrc.lyric))
			})
		}

	}
}

export const changeSongById = id => {
	return (dispatch, getState) => {
		// 1.检查是否在列表中，是的话直接改变playIdx、获取歌曲，没有就加到最后，然后改变playIdx、
		let playList = getState().getIn(["player", "playList"])
		let playIdx = getState().getIn(["player", "playIdx"])
		let locationArr = getState().getIn(["player", "locationArr"])

		let oldIdx = playList.findIndex(v => v.id === id)
		// 播放的正是这首
		if (playIdx === oldIdx && playIdx !== -1) return

		if (oldIdx === -1) {
			fetchSongsDetail(id).then(res => {
				dispatch(changeList([...playList, ...res.songs]))
				dispatch(changePlaySongInfoAct(res.songs[0]))

				let arr = getLocationArr(getState)
				dispatch(locationArrAct(arr))
				fetchSongUrl(id).then(res => {
					let song = res.data[0]
					dispatch(changePlaySong(song))
					dispatch(changePlaySongIdx(arr.findIndex(v => v === playList.length)))
				})
				// 获取歌词
				fetchLyric(id).then(res => {
					dispatch(changeLyric(res.lrc.lyric))
				})
			})
		} else {
			fetchSongUrl(id).then(res => {
				let song = res.data[0]
				dispatch(changePlaySong(song))
				dispatch(changePlaySongIdx(locationArr.findIndex(v => v === oldIdx)))
				dispatch(changePlaySongInfoAct(playList[oldIdx]))
			})
			// 获取歌词
			fetchLyric(id).then(res => {
				res.lrc && dispatch(changeLyric(res.lrc.lyric))
			})
		}

	}
}

export const addSongToList = info => {
	return (dispatch, getState) => {
		let playList = getState().getIn(["player", "playList"])
		let ids = []
		if (info instanceof Array) {
			// 如果是数组，是加入一个歌单的情况
			// 获取不在列表中的数组
			let hasIds = playList.map(v => v.id);
			info.forEach(id => {
				if (!hasIds.includes(id)) {
					ids.push(id)
				}
			})
		} else {
			let findIdx = playList.findIndex(v => v.id === Number(info))
			if (findIdx === -1) ids.push(info)
		}
		if (ids.length === 0) return

		fetchSongsDetail(ids).then(res => {
			dispatch(changeList([...playList, ...res.songs]))
			let arr = getLocationArr(getState)
			dispatch(locationArrAct(arr))
		})
	}
}

export const deletePlayListSong = idx => {
	return (dispatch, getState) => {
		let deleteAll = !idx && idx !== 0 ? true : false;

		if (deleteAll) {
			dispatch(changeList([]))
			dispatch(locationArrAct([]))
			dispatch(changePlaySongIdx(-1))
		} else {
			let playList = getState().getIn(["player", "playList"])
			let locationArr = getState().getIn(["player", "locationArr"])

			let cpList = [...playList]
			cpList.splice(idx, 1)
			dispatch(changeList(cpList))

			let cpLocArr = [...locationArr]
			let arr = cpLocArr.filter(v => v !== idx).map(v => v > idx ? v - 1 : v)
			dispatch(locationArrAct(arr))
		}
	}
}

const changePanelIsShowAct = show => {
	return {
		type: actionType.CHANGE_PANEL_IS_SHOW,
		show
	}
}

export const changePanelIsShow = state => {
	return (dispatch, getState) => {
		let res = state
		if (state === undefined) {
			let panelIsShow = getState().getIn(["player", "panelIsShow"])
			res = !panelIsShow
		}
		dispatch(changePanelIsShowAct(res))
	}
}

export const playNewList = (listId, listType = "list") => {
	return (dispatch, getState) => {
		const fun = (
			listType === 'list' ? fetchListDetail :
			listType === 'album' ? fetchAlbumSongs : null
		)
		if (!fun) return
		fun(listId).then(res => {
			const data =
				listType === 'list' ? res.playlist.tracks :
				listType === 'album' ? res.songs : [];
			dispatch(changeList(data))
			let arr = getLocationArr(getState)
			dispatch(locationArrAct(arr))
			let idx = arr[0]

			let songInfo = data[idx]

			fetchSongUrl(songInfo.id).then(res => {
				let song = res.data[0]
				dispatch(changePlaySong(song))
				dispatch(changePlaySongIdx(0))
				dispatch(changePlaySongInfoAct(songInfo))
			})

			// 获取歌词
			fetchLyric(songInfo.id).then(res => {
				dispatch(changeLyric(res.lrc.lyric))
			})
		}).catch(() => { })
	}
}

export const addNewListToList = listId => {
	return (dispatch, getState) => {
		let playList = getState().getIn(["player", "playList"])
		let playIdx = getState().getIn(["player", "playIdx"])
		let locationArr = getState().getIn(["player", "locationArr"])

		fetchListDetail(listId).then(res => {
			let listArr = res.playlist.tracks;
			let oldIds = playList.map(v => v.id)
			let newSongs = listArr.filter(v => !oldIds.includes(v.id))
			let newList = [...playList, ...newSongs]

			dispatch(changeList(newList))
			let arr = getLocationArr(getState)
			dispatch(locationArrAct(arr))

			let oldIdx = locationArr[playIdx]
			let newIdx = newList.findIndex(v => v === oldIdx)
			dispatch(changePlaySongIdx(newIdx))

		}).catch(() => { })
	}
}

export const changeNowTime = time => {
	return dispatch => {
		dispatch({ type: actionType.CHANGE_NOW_TIME, time })
	}
}
