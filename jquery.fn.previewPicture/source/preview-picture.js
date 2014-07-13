/**
 * @des 商品详情页面图片放大预览效果
 * @author jiangchaoyi update @2014.7.12
 */
(function($) {
	$.fn.previewPicture = function(options) {

		/**
		 * 默认值
		 * @param Array data 数据源，例如：[{'minImg':'',midImg:'',bigImg:''},{'minImg':'',midImg:'',bigImg:''}]
		 * @param String blankImg 空图片地址,用来临时替换img标签的src属性，防止图片不存在样式难看
		 * @param String loadingImg 懒加载图片
		 * @param Inter minWidth 小图片的宽度
		 * @param Inter marginRight 图片右边距的距离
		 * @param Inter delay 预览延迟时间单位：毫秒(ms),100ms一跳，用来防止鼠标经过就加载预览大图
		 */
		var defaults = {
			data : new Array(),
			blankImg : '../source/blank.gif',
			loadingImg : '../source/loading.gif',
			minWidth : 62,
			marginRight :  12,
			delay : 300
		};
		var opt = $.extend(defaults, options);	
		var IMG = {
			/**
			 * 默认值
			 * @param String src 需要加载图片的地址
			 * @param Function fnSucceed 图片加载成功后的回调函数，支持往回调函数传回刚刚加载成功的IMG对象
			 * @param Function fnError 图片加载失败的回调函数
			 */
			load : function(src, fnSucceed, fnError) {
				if(src && src.length > 0){
					var objImg = new Image();
					objImg.src = src;
					if (objImg.complete) {
						fnSucceed && fnSucceed(objImg);
					} else {
						objImg.onload = function() {
							fnSucceed && fnSucceed(objImg);
						};
					}
					objImg.onerror = function() {
						fnError && fnError();
					};
				}else{
					fnError && fnError();
				}			
			}
		};

		//全局变量声明
		var $this = this,
			offset = opt.minWidth + opt.marginRight,
			delayCount = 0,//延时统计
			timer,//定时器
			isLoading = true,//图片是否正在加载，如果主图没有加载完，是不能先预览大图的
			curOffset = 0,//当前小图片列表的位移，默认是0
			curIndex = 0,//当前选中图片索引,默认从0开始
			pageSize = 0,//每页可显示的图片数
			picBigSize = {//放大预览图显示框尺寸
				w : 0,
				h : 0
			},
			curPicBigSize = {//当前放大预览图的实际尺寸
				w : 0,
				h : 0
			},
			picMidSize = {//当前主图显示框尺寸
				w : 0,
				h : 0
			},
			curPicMidSize = {//当前主图的实际尺寸
				w : 0,
				h : 0
			},
			dragSize = {//放大拖柄的size
				w : 0,
				h : 0
			},
			dragBoxPos = {//放大拖柄容器坐标(相对于body)
				top : 0, 
				left : 0
			},
			dragPos = {//放大拖柄的坐标(相对于放大拖柄容器)	
				top : 0, 
				left : 0
			},		
			picListWidth,//小图片列表总宽度
			picListBoxWidth,//小图片的可视宽度
			eMinPicLists,//小图片元素数组集合
			ePicList,//小图片列表			
			ePrevBox,//主容器
			ePicBig,//放大预览容器
			ePicMid,//主图容器
			ePicPager,//图片分页容器
			ePicListBox,//图片列表容器
			eBtnPre,//按钮-上一页
			eBtnNext,//按钮-下一页
			ePrevMidLoading,//主图正在加载时的状态
			ePrevBigLoading,//放大预览图正在加载时的状态
			ePrevMidImg,//主图图片
			ePrevBigImg,//放大预览图图片
			ePrevDragBox,//放大拖柄容器
			ePrevDrag,//放大拖柄
		    strBlankImg = '<img class="img-error" src="'+ opt.blankImg +'" />',//空图片
			strPrevLoading = '<div class="prev-loading">正在努力加载,请稍后...</div>',//加载中
			strEmpty = '<div class="prev-empty">抱歉,无图片数据~</div>';//没有数据的情况	

		/**
		 * 根据数据生成html结构
		 */	
		function bindHtml(){
			$this.html('');

			ePrevBox = $('<div />',{
				'class' : 'prev-box'
			});

			ePicBig = $('<div />',{
				'class' : 'pic-big',
				'html' : strBlankImg + strPrevLoading
			});
			
			ePicMid = $('<div />',{
				'class' : 'pic-mid',
				'html' :  strPrevLoading + '<div class="prev-drag-box"><div class="prev-drag"></div>' + strBlankImg + '</div>'
			});
			
			ePicPager = $('<div />',{
				'class' : 'pic-pager'
			});
			
			ePicListBox = $('<div />',{
				'class' : 'pic-list-box'
			});		
			
			eBtnPre = $('<a />',{
				'class' : 'pager-btn pager-btn-pre pager-btn-disabled',
				'href' : 'javascript:;',
				'html' : '&lt;'
			});
			
			eBtnNext = $('<a />',{
				'class' : 'pager-btn pager-btn-next',
				'href' : 'javascript:;',
				'html' : '&gt;'
			});

			ePicListBox.html(Pager.getPagerHtml());
			ePicPager.append(ePicListBox);
			ePicPager.append(eBtnPre);
			ePicPager.append(eBtnNext);

			ePrevBox.append(ePicBig);
			ePrevBox.append(ePicMid);
			ePrevBox.append(ePicPager);

			$this.append(ePrevBox);
		}


		/**
		 * 大图预览
		 */	
		var Preview = {
			//设置drag和预览大图位置
			setPosition : function(e){
				var curPageX = e.pageX,//鼠标的坐标
					curPageY = e.pageY,
					_top = curPageY - dragBoxPos.top,
					_left = curPageX - dragBoxPos.left;
				dragBoxPos = ePrevDragBox.offset(),
				dragPos.top = _top - dragSize.h / 2,
				dragPos.left = _left - dragSize.w / 2;
				if (0 > dragPos.top) {
					dragPos.top = 0;
				}
				if (0 > dragPos.left) {
					dragPos.left = 0;
				}
				if (dragPos.top + dragSize.h > curPicMidSize.h) {
					dragPos.top = curPicMidSize.w - dragSize.h;
				}
				if (dragPos.left + dragSize.w > curPicMidSize.w) {
					dragPos.left = curPicMidSize.w - dragSize.w;
				}
				ePrevDrag.css({
					top : dragPos.top,
					left : dragPos.left
				});
				ePrevBigImg.css({
					top : -dragPos.top * (curPicBigSize.h / curPicMidSize.h),
					left : -dragPos.left * (curPicBigSize.w / curPicMidSize.w) 
				});
			},
			//显示大图预览
			showBig : function(){
				ePicBig.show();
				ePrevDragBox.css({
					cursor: 'move'
				});
			},
			//隐藏大图预览
			hideBig : function(){
				ePicBig.hide();
				ePrevDrag.hide();
				ePrevDragBox.css({
					cursor: 'auto'
				});
			},
			// 显示当前选中小图的主图片
			showMidPic : function(){
				ePrevMidLoading.show();
				var src = opt.data[curIndex].midImg;
				isLoading = true;
				IMG.load(src, function(img){
					isLoading = false;
					curPicMidSize.w= img.width;
					curPicMidSize.h= img.height;

					//重置主图size，根据主图高度和宽度做等比压缩，3种大情况：
					//1、如果主图高度大于宽度并且主图高度大于主图容器宽度就等高压缩；
					//2、如果主图宽度大于主图高度并且主图宽度大于主图容器宽度就等宽压缩
					//3、宽度等于高度并且主图宽度大于主容器宽度就等宽压缩
					if(curPicMidSize.h > curPicMidSize.w){
						if(curPicMidSize.h > picMidSize.h){
							curPicMidSize.h = picMidSize.h;
						}
						curPicMidSize.w = picMidSize.h * curPicMidSize.w / curPicMidSize.h;
					}else {
						if(curPicMidSize.w > picMidSize.w){
							curPicMidSize.w = picMidSize.w;
						}					
						curPicMidSize.h = picMidSize.h * curPicMidSize.w / picMidSize.w;
					}
					var cssOpts = {
						top : (picMidSize.h - curPicMidSize.h)/2,
						left : (picMidSize.w - curPicMidSize.w)/2,
						width : curPicMidSize.w,
						height : curPicMidSize.h
					}
					//设置拖柄框容器size和position
					ePrevDragBox.css(cssOpts);
					//重置主图size
					ePrevMidImg.css({
						width : curPicMidSize.w,
						height : curPicMidSize.h
					});
					//设置当前拖柄框的位置
					dragBoxPos = ePrevDragBox.offset();
					ePrevMidImg.attr('src',src);
					ePrevMidLoading.hide();
				},function(){
					isLoading = true;
				});
			}
		}

		/**
		 * 分页相关方法
		 */	
		var Pager = {
			//初始化
			init : function(){
				Pager.setMinPic();
				Pager.go();
			},
			/**
			 * 拼接分页图片数据
			 * @return String 返回拼接后的分页数据 
			 */	
			getPagerHtml : function(){
				var len = opt.data.length;
				picListWidth = offset*len;
				var str = '<div class="pic-list clearfix" style="width:' + picListWidth + 'px;">',_temp = '';
				for(var i=0;i<len;i++){
					_temp = '';
					//初始绑定第一个
					if(i === 0){
						_temp = ' class="current" '
					}
					str +='<a href="javascript:;"'+_temp+'><em></em><img class="img-error" src="'+ opt.data[i].minImg +'" /></a>';				
				}
				return str + '</div>';
			},
			//滑动到指定分页
			go : function(){
				ePicList.animate({
					left : -curOffset
				});
				Pager.setBtnStatus();
			},
			/**
			 * 设置分页按钮状态
			 */
			setBtnStatus : function(){
				if(curOffset == 0){
					eBtnPre.addClass('pager-btn-disabled');
				}else{
					eBtnPre.removeClass('pager-btn-disabled');
				}
				if((curOffset >= picListWidth - picListBoxWidth -opt.marginRight) || picListBoxWidth >= picListWidth){
					eBtnNext.addClass('pager-btn-disabled');
				}else{
					eBtnNext.removeClass('pager-btn-disabled');
				}				
			},
			/**
			 * 判断当前选中图片是否在当前分页内
			 */
			curPicIsInPicListBox : function(){
				var curPicOffset = curIndex * offset;
				if(curPicOffset >= curOffset && curPicOffset <= curOffset+picListBoxWidth){
					return true;
				}
				return false;
			},
			/**
			 * 设置小图片的选中状态
			 */	
			setMinPic : function(){		
				eMinPicLists.removeClass('current');
				eMinPicLists.eq(curIndex).addClass('current');			
				Preview.showMidPic();
			}		
		}

		/**
		 * 注册所有事件
		 */	
		var Events = {
			//事件初始化
			init : function(){
				Events.regBtnPre();
				Events.regBtnNext();
				Events.regMinPic();
				Events.regMidPic();
				Events.regDrag();
			},
			//上一页
			regBtnPre : function(){
				eBtnPre.click(function(){
					if(curOffset > 0){
						curOffset-=offset;
						Pager.go();
					}
					if(!Pager.curPicIsInPicListBox()){
						curIndex--;
						Pager.setMinPic();
					}	
				});
			},
			//下一页
			regBtnNext : function(){				
				eBtnNext.click(function(){
					if($(this).hasClass('pager-btn-disabled')){
						return false;
					}
					if(curOffset + picListBoxWidth + offset< picListWidth){
						curOffset+=offset;
						Pager.go();
					}	
					if(!Pager.curPicIsInPicListBox()){
						curIndex++;
						Pager.setMinPic();
					}		
				});
			},
			//设置单击的图片为当前图片
			regMinPic : function(){
				eMinPicLists.click(function(){
					if($(this).hasClass('pager-btn-disabled')){
						return false;
					}
					curIndex = eMinPicLists.index($(this));
					Pager.setMinPic();
				});
			},
			//预览大图
			regMidPic : function(){
				ePicMid.hover(function(){
					delayCount = opt.delay;
					//如果鼠标没有停留delay指定的时间就不执行
					timer = setInterval(function(){
						console.log(delayCount);
						delayCount-=100;
						if(delayCount<=0){
							clearInterval(timer);
							var src = opt.data[curIndex].bigImg;
							IMG.load(src, function(img){	
								//如果主图是加载状态，就不加载预览大图
								if(isLoading){
									Preview.hideBig();
									return;
								}

								curPicBigSize.w = img.width;
								curPicBigSize.h = img.height;	

								//当预览大图的尺寸小于主图的尺寸，则不显示预览图			
								if(curPicMidSize.w >= curPicBigSize.w || curPicMidSize.h >=  curPicBigSize.h){
									Preview.hideBig();
									return;
								}			
								
								Preview.showBig();
								dragSize.w = picMidSize.w * picBigSize.w / curPicBigSize.w;
								dragSize.h = picMidSize.h * picBigSize.h / curPicBigSize.h;
								ePrevDrag.css({
									display : 'block',
									width : dragSize.w,
									height : dragSize.h
								});						
								ePrevBigImg.attr('src',src);
								ePrevBigLoading.hide();					
							});	
						}
					},100);									
				},function(){
					timer && clearInterval(timer);
					Preview.hideBig();
				});
			},
			//拖柄事件
			regDrag : function(){
				ePicMid.mousemove(function(e){
					Preview.setPosition(e);
				});	
			}
		}

		//初始化
		init();
		function init(){
			//如果没有图片数据输出错误提示信息
			if(opt.data && opt.data.length<=0){
				$this.html(strEmpty);
				return;
			}

			//初始化dom结构
			bindHtml();

			//初始化变量
			ePicList = ePicListBox.find('.pic-list');
			eMinPicLists = ePicList.find('a');
			ePrevMidLoading = ePicMid.find('.prev-loading');
			ePrevBigLoading = ePicBig.find('.prev-loading');
			ePrevMidImg = ePicMid.find('.img-error');
			ePrevBigImg = ePicBig.find('.img-error');
			ePrevDragBox = ePicMid.find('.prev-drag-box');
			ePrevDrag = ePrevDragBox.find('.prev-drag');
			picListBoxWidth = ePicListBox.width();
			pageSize = parseInt((picListBoxWidth + opt.marginRight) / offset);
			picBigSize.w = ePicBig.width();
			picBigSize.h = ePicBig.height();
			picMidSize.w = ePicMid.width();
			picMidSize.h = ePicMid.height();

			//选中第一张图片
			Pager.init();	
			//初始化事件		
			Events.init();
		}
		
	};
})(jQuery);